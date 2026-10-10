import { Router } from 'express'
import { z } from 'zod'

import { requireAuth, requireRoles, writeRateLimit } from '../middleware.js'
import { HttpError, service } from '../services/trustforgeService.js'

const router = Router()
const organizer = requireRoles('ORGANIZER', 'ADMIN')
const evaluationSchema = z.object({ projectId: z.string().min(1).max(80), scores: z.record(z.string(), z.coerce.number()), comment: z.string().max(2000).optional().default('') })
const projectSchema = z.object({ projectId: z.string().min(1).max(80) })
const commentSchema = z.object({ projectId: z.string().min(1).max(80), body: z.string().trim().min(1).max(2000) })
const submissionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  track: z.string().trim().min(2).max(80),
  description: z.string().trim().min(20).max(2000),
  problemStatement: z.string().trim().min(20).max(3000),
  solution: z.string().trim().min(20).max(3000),
  technology: z.string().trim().min(2).max(500),
  team: z.string().trim().min(2).max(300),
  repository: z.string().url().max(500),
  demo: z.string().url().max(500),
  supportingLinks: z.array(z.string().url().max(500)).max(5).optional().default([])
})

router.get('/dashboard', requireAuth, async (_req, res, next) => { try { res.json(await service.dashboard()) } catch (error) { next(error) } })
router.get('/events', async (_req, res, next) => { try { const data = await service.dashboard(); res.json(data.event) } catch (error) { next(error) } })
router.get('/submissions', async (req, res, next) => { try { const items = await service.projects(typeof req.query.q === 'string' ? req.query.q : undefined); res.json({ items, total: items.length, page: 0, pageSize: 50 }) } catch (error) { next(error) } })
router.post('/submissions', requireRoles('PARTICIPANT', 'ORGANIZER', 'ADMIN'), writeRateLimit, async (req, res, next) => { try { const body = submissionSchema.parse(req.body); res.status(202).json(await service.createSubmission(req.user!, body)) } catch (error) { next(error) } })
router.get('/submissions/:id/events', requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id)
    const submission = await service.getSubmission(id, req.user!)
    res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
    res.flushHeaders()
    const write = (event: unknown) => { res.write(`event: submission\ndata: ${JSON.stringify(event)}\n\n`) }
    submission.events.forEach(write)
    const unsubscribe = service.subscribeSubmission(id, write)
    const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 15_000)
    req.on('close', () => { clearInterval(keepAlive); unsubscribe() })
  } catch (error) { next(error) }
})
router.get('/submissions/:id', requireAuth, async (req, res, next) => { try { res.json(await service.getSubmission(String(req.params.id), req.user!)) } catch (error) { next(error) } })
router.get('/gallery', async (req, res, next) => { try { const items = await service.projects(typeof req.query.q === 'string' ? req.query.q : undefined); res.json({ items, votingOpen: true, resultsVisible: false, ordering: 'seeded-random' }) } catch (error) { next(error) } })
router.get('/judges', organizer, async (_req, res, next) => { try { res.json({ items: await service.judges(), metrics: await service.assignmentMetrics() }) } catch (error) { next(error) } })
router.get('/assignments', organizer, async (_req, res, next) => { try { res.json({ items: await service.assignments(), metrics: await service.assignmentMetrics() }) } catch (error) { next(error) } })
router.post('/assignments/run', organizer, writeRateLimit, async (_req, res, next) => { try { res.json(await service.runAssignments()) } catch (error) { next(error) } })

router.get('/evaluations', requireAuth, async (req, res, next) => { try { res.json(await service.evaluations(req.user!)) } catch (error) { next(error) } })
router.post('/evaluations', requireRoles('JUDGE'), writeRateLimit, async (req, res, next) => { try { const body = evaluationSchema.parse(req.body); res.status(201).json(await service.evaluate(req.user!, body.projectId, body.scores, body.comment)) } catch (error) { next(error) } })

router.get('/normalization', requireAuth, async (_req, res, next) => { try { res.json(await service.normalization()) } catch (error) { next(error) } })
router.post('/normalization/run', organizer, writeRateLimit, async (req, res, next) => { try { res.json(await service.runNormalization(req.user!.email)) } catch (error) { next(error) } })
router.get('/normalization/proof', requireAuth, async (_req, res, next) => { try { res.json({ title: 'Normalization proof', formula: 'z = (score - judge mean) / judge standard deviation', edgeCases: ['zero standard deviation uses a stable unit denominator', 'small sample size is disclosed', 'missing evaluations are not silently imputed'], result: await service.normalization() }) } catch (error) { next(error) } })

router.get('/anomalies', organizer, async (_req, res, next) => { try { const items = await service.anomalies(); res.json({ items, summary: { potential: items.length, openReviews: items.filter((item) => item.status !== 'RESOLVED').length, resolved: items.filter((item) => item.status === 'RESOLVED').length } }) } catch (error) { next(error) } })
router.post('/anomalies/:id/review', organizer, async (req, res, next) => { try { res.json(await service.reviewAnomaly(String(req.params.id), typeof req.body?.notes === 'string' ? req.body.notes : '')) } catch (error) { next(error) } })

router.get('/audit', organizer, async (_req, res, next) => { try { res.json(await service.auditData()) } catch (error) { next(error) } })
router.post('/audit/verify', organizer, async (_req, res, next) => { try { const data = await service.auditData(); res.json(data.verification) } catch (error) { next(error) } })

router.get('/results', async (_req, res, next) => { try { res.json(await service.resultCenter()) } catch (error) { next(error) } })
router.post('/results/publish', organizer, writeRateLimit, async (_req, res, next) => { try { res.json(await service.publishResults()) } catch (error) { next(error) } })
router.get('/votes', organizer, async (_req, res, next) => { try { res.json(await service.votes()) } catch (error) { next(error) } })
router.post('/votes', requireRoles('ADMIN', 'ORGANIZER', 'JUDGE', 'PARTICIPANT'), writeRateLimit, async (req, res, next) => { try { const body = projectSchema.parse(req.body); res.status(201).json(await service.castVote(req.user!, body.projectId)) } catch (error) { next(error) } })
router.get('/comments', async (req, res, next) => { try { res.json(await service.comments(typeof req.query.projectId === 'string' ? req.query.projectId : undefined)) } catch (error) { next(error) } })
router.post('/comments', requireAuth, writeRateLimit, async (req, res, next) => { try { const body = commentSchema.parse(req.body); res.status(201).json(await service.addComment(req.user!, body.projectId, body.body)) } catch (error) { next(error) } })
router.get('/notifications', requireAuth, async (req, res, next) => { try { res.json(await service.notifications(req.user!)) } catch (error) { next(error) } })
router.get('/pairwise', async (_req, res, next) => { try { res.json(await service.pairwise()) } catch (error) { next(error) } })
router.get('/certificates/verify', async (req, res, next) => { try { res.json(await service.certificate(typeof req.query.id === 'string' ? req.query.id : '')) } catch (error) { next(error) } })
router.post('/certificates/verify', async (req, res, next) => { try { const id = z.object({ certificateId: z.string().min(1).max(120) }).parse(req.body).certificateId; res.json(await service.certificate(id)) } catch (error) { next(error) } })
router.get('/search', async (req, res, next) => { try { const q = z.string().min(1).parse(req.query.q); res.json(await service.search(q)) } catch (error) { next(error) } })
router.get('/health/demo', async (_req, res, next) => { try { const audit = await service.auditData(); res.json({ status: 'UP', database: 'postgresql', cache: 'redis-optional', audit: audit.verification }) } catch (error) { next(new HttpError(503, 'Database is unavailable')) } })
router.get('/public/certificates/:id', async (req, res, next) => { try { res.json(await service.certificate(String(req.params.id))) } catch (error) { next(error) } })

export default router
