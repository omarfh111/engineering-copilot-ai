import type { ReviewStatus } from '../types/review';
import { formatEnumLabel } from './analysis';

export const reviewStatusOptions: ReviewStatus[] = ['PENDING', 'ACCEPTED', 'REJECTED'];

export { formatEnumLabel };
