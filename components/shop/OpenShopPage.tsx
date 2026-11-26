'use client';
import { Guard } from '@/components/auth/Guard';
import { OpenShopStepper } from './OpenShopStepper';

/** /buka-toko — tamu → masuk, admin ditolak (Guard); yang sudah punya toko diarahkan oleh OpenShopStepper. */
export function OpenShopPage() {
  return <Guard need="shopless" allowWithShop>{(me) => <OpenShopStepper me={me} />}</Guard>;
}
