import { createFileRoute } from '@tanstack/react-router';
import { OwnerCreatePage } from '@/features/owners/pages/OwnerCreatePage';

export const Route = createFileRoute('/owners/new' as never)({
  component: OwnerCreatePage,
});

