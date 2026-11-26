const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { analyzeLimiter, submitLimiter, loginLimiter } = require('../middleware/rateLimiters');
const s = require('../validators/schemas');
const pub = require('../controllers/public.controller');
const auth = require('../controllers/auth.controller');
const admin = require('../controllers/admin.controller');
const quote = require('../controllers/quotation.controller');

const router = Router();

/* Public */
router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));
router.get('/catalogue', pub.getCatalogue);
router.post('/enquiries/analyze', analyzeLimiter, validate({ body: s.analyzeSchema }), pub.analyze);
router.post('/enquiries', submitLimiter, validate({ body: s.enquirySchema }), pub.submitEnquiry);

/* Auth */
router.post('/auth/login', loginLimiter, validate({ body: s.loginSchema }), auth.login);
router.get('/auth/me', authenticate, auth.me);

/* Admin (all routes below require a valid admin token) */
const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));

adminRouter.get('/stats', admin.stats);
adminRouter.get('/enquiries', validate({ query: s.listQuerySchema }), admin.listEnquiries);
adminRouter.get('/enquiries/:id', validate({ params: s.idParams }), admin.getEnquiry);
adminRouter.patch('/enquiries/:id/status', validate({ params: s.idParams, body: s.statusUpdateSchema }), admin.updateStatus);

adminRouter.get('/quotation-defaults', quote.defaults);
adminRouter.put('/enquiries/:id/quotation', validate({ params: s.idParams, body: s.quotationSchema }), quote.saveQuotation);
adminRouter.post('/enquiries/:id/quotation/approve', validate({ params: s.idParams }), quote.approveQuotation);
adminRouter.get('/enquiries/:id/quotation/pdf', validate({ params: s.idParams }), quote.downloadPdf);
adminRouter.post('/enquiries/:id/quotation/send', validate({ params: s.idParams }), quote.sendQuotation);

router.use('/admin', adminRouter);

module.exports = router;
