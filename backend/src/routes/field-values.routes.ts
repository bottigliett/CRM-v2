import express from 'express';
import { getFieldValues, renameFieldValue } from '../controllers/field-values.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/:table/:field', getFieldValues);
router.put('/:table/:field/rename', renameFieldValue);

export default router;
