import { Request, Response } from 'express'
import { createReadStream, statSync } from "fs"
import ImageKit from "imagekit"
import https from "https"
import type { IncomingMessage } from 'http'
import dns from 'dns'
import { pipeline } from "stream"

// Prefer IPv4 first to avoid IPv6 connectivity issues
try { (dns as any).setDefaultResultOrder?.('ipv4first') } catch {}

// Custom IPv4-only lookup used by https requests
const lookupIPv4: any = (hostname: string, options: any, cb: any) => {
    const opts = (typeof options === 'function' || options == null) ? { family: 4 } : { ...options, family: 4 }
    return dns.lookup(hostname, opts as any, cb as any)
}

const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 })

// Initialize ImageKit
export const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || ''
})

export class VideoStreamService {
    // Get all videos from ImageKit
    static async getAllVideos(): Promise<{ videos: any[] }> {
        try {
            const response = await imagekit.listFiles({
                limit: 100,
                type: 'file'
            })

            // Filter only video files
            const videos = response
                .filter((video: any) => video.fileType === 'non-image' && video.url?.includes('video'))
                .map((video: any) => {
                    // Use original file URL without transformations to avoid quota limits
                    const baseUrl = video.url.split('?')[0]
                    const originalUrl = baseUrl + '?tr=orig-true'

                    return {
                        name: video.name,
                        fileId: video.fileId,
                        thumbnail: video.thumbnail,
                        url: originalUrl, // Use original URL to bypass transformation limits
                        size: video.size,
                        createdAt: video.createdAt,
                        updatedAt: video.updatedAt
                    }
                })

            return { videos }
        } catch (error) {
            console.error('Error fetching videos:', error)
            throw new Error('Failed to fetch videos')
        }
    }

    // Method to stream videos directly from ImageKit URL
    static async streamVideo(req: Request, res: Response): Promise<Response | void> {
        const { fileId } = req.params

        try {
            if (!fileId) {
                return res.status(400).json({ error: 'File ID is required' })
            }

            // Get file details from ImageKit
            let fileDetails: any = null
            let videoUrl: string = ''

            try {
                fileDetails = await imagekit.getFileDetails(fileId)

                if (!fileDetails) {
                    return res.status(404).json({ error: 'File not found' })
                }

                // Check if it's a video file based on file extension
                const fileName = fileDetails.name.toLowerCase()
                const isVideo = fileName.endsWith('.mp4') || fileName.endsWith('.avi') ||
                               fileName.endsWith('.mov') || fileName.endsWith('.mkv') ||
                               fileName.endsWith('.webm') || fileName.endsWith('.flv')

                if (!isVideo) {
                    return res.status(404).json({ error: 'File is not a video' })
                }

                // Try to use the original URL without transformations
                // Remove any transformation parameters and use raw file access
                const baseUrl = fileDetails.url.split('?')[0] // Remove query params
                videoUrl = baseUrl + '?tr=orig-true' // Force original file without transformations
                console.log('Using original ImageKit URL:', videoUrl)

            } catch (imagekitError: any) {
                console.warn('ImageKit API call failed:', imagekitError.message)

                // Fallback: construct ImageKit URL directly from fileId with original file flag
                const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/jhw0s6ewo'
                videoUrl = `${urlEndpoint}/videos/${fileId}.mp4?tr=orig-true`
                console.log('Using fallback ImageKit URL:', videoUrl)
            }

            const range = req.headers.range

            // Set basic response headers
            res.setHeader('Content-Type', 'video/mp4')
            res.setHeader('Accept-Ranges', 'bytes')

            // Make a HEAD request to get the file size
            const headRequest = new Promise<{contentLength: number, contentType: string}>((resolve, reject) => {
                const urlObj = new URL(videoUrl)
                const options = {
                    method: 'HEAD',
                    hostname: urlObj.hostname,
                    port: urlObj.port || 443,
                    path: urlObj.pathname + urlObj.search,
                    headers: {},
                    agent: httpsAgent
                }

                const headReq = https.request(options, (headRes) => {
                    resolve({
                        contentLength: parseInt(headRes.headers['content-length'] || '0'),
                        contentType: headRes.headers['content-type'] || 'video/mp4'
                    })
                })

                headReq.on('error', reject)
                headReq.end()
            })

            const { contentLength, contentType } = await headRequest

            if (!range) {
                // If no range header, stream the entire file
                const urlObj = new URL(videoUrl)
                const options = {
                    hostname: urlObj.hostname,
                    port: urlObj.port || 443,
                    path: urlObj.pathname + urlObj.search,
                    method: 'GET',
                    headers: {
                        'User-Agent': req.headers['user-agent'] || 'NodeProxy/1.0',
                        'Accept': req.headers['accept'] || '*/*'
                    },
                    agent: httpsAgent
                }

                const videoReq = https.request(options, (upstreamRes) => {
                    const headers: Record<string, string> = {
                        'Content-Type': upstreamRes.headers['content-type'] || contentType,
                    }
                    if (upstreamRes.headers['content-length']) headers['Content-Length'] = upstreamRes.headers['content-length']
                    if (upstreamRes.headers['accept-ranges']) headers['Accept-Ranges'] = upstreamRes.headers['accept-ranges']

                    res.writeHead(upstreamRes.statusCode || 200, headers)

                    pipeline(upstreamRes, res, (err) => {
                        if (err) {
                            if ((err.code === 'ECONNRESET' || err.name === 'AbortError') && res.headersSent) return
                            console.error('Pipeline error:', err)
                        }
                    })
                })

                req.on('close', () => {
                    if (!res.writableEnded) videoReq.destroy()
                })

                videoReq.on('error', (err: any) => {
                    console.error('Video request error:', err)
                    if (!res.headersSent) res.status(500).json({ error: 'Video streaming failed' })
                })

                videoReq.end()
                return
            }

            // Parse range header for partial content
            const chunkSize = 1000000 // 1MB chunks
            const rangeHeader = String(range).replace(/bytes=/, '')
            const [startStr, endStr] = rangeHeader.split('-')
            const start = startStr ? parseInt(startStr, 10) : 0

            if (Number.isNaN(start) || start >= contentLength) {
                res.setHeader('Content-Range', `bytes */${contentLength}`)
                return res.status(416).end()
            }

            let end = endStr ? parseInt(endStr, 10) : Math.min(start + chunkSize - 1, contentLength - 1)
            end = Math.min(end, contentLength - 1)

            // Make a range request to ImageKit
            const urlObj = new URL(videoUrl)
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'Range': `bytes=${start}-${end}`,
                    'User-Agent': req.headers['user-agent'] || 'NodeProxy/1.0',
                    'Accept': req.headers['accept'] || '*/*'
                },
                agent: httpsAgent
            }

            const videoReq = https.request(options, (upstreamRes) => {
                const headers: Record<string, string> = {
                    'Accept-Ranges': 'bytes',
                    'Content-Type': upstreamRes.headers['content-type'] || contentType,
                }
                if (upstreamRes.headers['content-range']) headers['Content-Range'] = upstreamRes.headers['content-range']
                if (upstreamRes.headers['content-length']) headers['Content-Length'] = upstreamRes.headers['content-length']

                res.writeHead(upstreamRes.statusCode || 206, headers)

                pipeline(upstreamRes, res, (err) => {
                    if (err) {
                        if ((err.code === 'ECONNRESET' || err.name === 'AbortError') && res.headersSent) return
                        console.error('Pipeline error:', err)
                    }
                })
            })

            req.on('close', () => {
                if (!res.writableEnded) videoReq.destroy()
            })

            videoReq.on('error', (err: any) => {
                console.error('Video request error:', err)
                if (!res.headersSent) res.status(500).json({ error: 'Video streaming failed' })
            })

            videoReq.end()

        } catch (error: any) {
            console.error('Error streaming video:', error)
            res.status(500).json({ error: 'Failed to stream video' })
        }
    }

    // Upload video to ImageKit
    static async uploadVideo(file: Express.Multer.File) {
        try {
            console.log('Uploading to ImageKit:', {
                fileName: file.originalname,
                size: file.size,
                mimetype: file.mimetype
            })

            const result = await imagekit.upload({
                file: file.buffer, // Use buffer from multer
                fileName: file.originalname,
                folder: "/videos"
            })

            console.log('Upload successful:', result.fileId)

            return {
                fileId: result.fileId,
                name: result.name,
                url: result.url,
                size: result.size
            }
        } catch (error: any) {
            console.error('Error uploading video:', error)
            throw new Error('Failed to upload video: ' + error.message)
        }
    }

    // Proxy ImageKit video URLs through our server to bypass client network issues
    static async proxyImageKitVideo(req: Request, res: Response): Promise<Response | void> {
        try {
            const raw = (req.query.url as string) || ''
            const urlStr = raw.includes('%') ? decodeURIComponent(raw) : raw
            if (!urlStr) return res.status(400).json({ error: 'URL is required' })

            let target: URL
            try {
                target = new URL(urlStr)
            } catch {
                return res.status(400).json({ error: 'Invalid URL' })
            }

            const allowedHost = process.env.IMAGEKIT_URL_ENDPOINT ? new URL(process.env.IMAGEKIT_URL_ENDPOINT).hostname : 'ik.imagekit.io'
            if (!(target.hostname === 'ik.imagekit.io' || target.hostname === allowedHost)) {
                return res.status(400).json({ error: 'URL host not allowed' })
            }

            // Ensure we request the original file (no transformations)
            const sp = target.searchParams
            const hasOrig = sp.getAll('tr').some(v => v.includes('orig-true'))
            if (!hasOrig) {
                if (sp.has('tr')) sp.set('tr', `${sp.get('tr')},orig-true`)
                else sp.set('tr', 'orig-true')
                target.search = sp.toString()
            }

            const range = req.headers.range as string | undefined

            // CORS
            const origin = (req.headers.origin as string) || process.env.CLIENT_URL || 'http://localhost:3000'
            res.setHeader('Access-Control-Allow-Origin', origin)
            res.setHeader('Vary', 'Origin')
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type')
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
            if (req.method === 'OPTIONS') return res.status(204).end()

            // Helper to follow redirects with retry logic
            const fetchUpstream = (init: URL, method: 'GET'|'HEAD', headers: Record<string,string>, redirects = 5, retries = 3): Promise<IncomingMessage> =>
                new Promise((resolve, reject) => {
                    const go = (current: URL, left: number, retryCount: number) => {
                        const opts: https.RequestOptions = {
                            hostname: current.hostname,
                            port: current.port || 443,
                            path: current.pathname + (current.search || ''),
                            method,
                            headers,
                            agent: httpsAgent,
                            lookup: lookupIPv4,
                        }
                        const r = https.request(opts, (resp) => {
                            const sc = resp.statusCode || 0
                            if ([301,302,303,307,308].includes(sc) && resp.headers.location && left > 0) {
                                let next: URL
                                try { next = new URL(resp.headers.location, current) } catch (e) { resp.resume(); return reject(e) }
                                const nextMethod: 'GET'|'HEAD' = sc === 303 ? 'GET' : method
                                const nextHeaders = { ...headers }
                                if (sc === 303 && nextHeaders['Range']) delete nextHeaders['Range']
                                resp.resume()
                                return go(next, left - 1, retryCount)
                            }
                            resolve(resp)
                        })
                        r.setTimeout(15000, () => r.destroy(new Error('Upstream timeout')))
                        r.on('error', (err: any) => {
                            const isNetworkError = /ENETUNREACH|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN/i.test(err.code || err.message)
                            if (isNetworkError && retryCount > 0) {
                                console.warn(`Network error ${err.code}, retrying... (${retryCount} attempts left)`)
                                setTimeout(() => go(current, left, retryCount - 1), 1000 * (4 - retryCount)) // exponential backoff
                                return
                            }
                            reject(err)
                        })
                        r.end()
                    }
                    go(init, redirects, retries)
                })

            const headers: Record<string,string> = {
                'User-Agent': (req.headers['user-agent'] as string) || 'VideoProxy/1.0',
                'Accept': (req.headers['accept'] as string) || '*/*',
            }
            if (range) headers['Range'] = range

            const upstream = await fetchUpstream(target, 'GET', headers)
            const status = upstream.statusCode || 502
            if (![200,206].includes(status)) {
                const msg = upstream.statusMessage || 'Upstream error'
                upstream.resume()
                return res.status(status).json({ error: msg })
            }

            const outHeaders: Record<string,string> = {}
            if (upstream.headers['content-type']) outHeaders['Content-Type'] = String(upstream.headers['content-type'])
            if (upstream.headers['content-length']) outHeaders['Content-Length'] = String(upstream.headers['content-length'])
            if (upstream.headers['content-range']) outHeaders['Content-Range'] = String(upstream.headers['content-range'])
            if (upstream.headers['accept-ranges']) outHeaders['Accept-Ranges'] = String(upstream.headers['accept-ranges'])
            if (!outHeaders['Accept-Ranges']) outHeaders['Accept-Ranges'] = 'bytes'
            if (!outHeaders['Content-Type']) outHeaders['Content-Type'] = 'video/mp4'
            outHeaders['Cache-Control'] = upstream.headers['cache-control'] ? String(upstream.headers['cache-control']) : 'public, max-age=3600'

            res.writeHead(status, outHeaders)
            pipeline(upstream, res, (err) => {
                if (!err) return
                const code = (err as any).code
                if (code === 'ECONNRESET' || code === 'ERR_STREAM_PREMATURE_CLOSE' || res.headersSent) return
                console.error('Proxy pipeline error:', err)
            })

            req.on('close', () => { if (!res.writableEnded) try { (upstream as any).destroy() } catch {} })
        } catch (err: any) {
            const msg = err?.message || String(err)
            console.warn('ImageKit proxy failed:', msg)

            // Check if this is a network error and try to serve from local fallback
            if (/(ENETUNREACH|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN)/i.test(msg)) {
                console.log('🔄 Network error detected, checking for local fallback...')

                // Try to extract filename from ImageKit URL for local fallback
                try {
                    const rawUrl = (req.query.url as string) || ''
                    const urlStr = rawUrl.includes('%') ? decodeURIComponent(rawUrl) : rawUrl
                    const url = new URL(urlStr)
                    const urlPath = url.pathname
                    const filename = urlPath.split('/').pop()

                    if (filename) {
                        // Check if file exists locally and serve it
                        const localVideoPath = `/api/local-videos/${filename}`
                        console.log(`🔄 Attempting local fallback: ${localVideoPath}`)

                        // Redirect to local video endpoint
                        res.setHeader('Location', localVideoPath)
                        return res.status(302).end()
                    }
                } catch (localErr) {
                    console.warn('Local fallback failed:', localErr)
                }

                return res.status(502).json({ error: 'Network unreachable: Unable to connect to ImageKit servers. Video temporarily unavailable.' })
            }

            console.error('Error in proxyImageKitVideo:', err)
            return res.status(500).json({ error: 'Internal server error' })
        }
    }
}
