import { createFileRoute } from '@tanstack/react-router';
import { OwnerEditPage } from '@/features/owners/pages/OwnerEditPage.tsx';

export const Route = createFileRoute('/owners/$ownerId' as never)({
  component: OwnerEditPage,
});
