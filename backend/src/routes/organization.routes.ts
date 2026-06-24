import express from 'express';
import {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from '../controllers/organization.controller';
import { getNotes, createNote, deleteNote } from '../controllers/organization-notes.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getOrganizations);
router.get('/:id', getOrganization);
router.post('/', createOrganization);
router.put('/:id', updateOrganization);
router.delete('/:id', deleteOrganization);

router.get('/:id/notes', getNotes);
router.post('/:id/notes', createNote);
router.delete('/:id/notes/:noteId', deleteNote);

export default router;
