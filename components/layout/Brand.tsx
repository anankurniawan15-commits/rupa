import Image from 'next/image';

/** Logo + wordmark "Rupa." (Poppins 700, #26B670). */
export function BrandMark() {
  return (
    <>
      <Image className="brand-mark" src="/brand/rupa-mark.png" alt="" width={31} height={40} priority />
      <span className="wm">Rupa.</span>
    </>
  );
}
