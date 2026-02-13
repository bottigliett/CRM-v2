import express from 'express';
import {
  getServiceContracts,
  getServiceContract,
  createServiceContract,
  updateServiceContract,
  deleteServiceContract,
} from '../controllers/service-contract.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getServiceContracts);
router.get('/:id', getServiceContract);
router.post('/', createServiceContract);
router.put('/:id', updateServiceContract);
router.delete('/:id', deleteServiceContract);

export default router;
