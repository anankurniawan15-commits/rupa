'use client';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/store/toast';
import { sortirService, useSavedAnalyses } from '@/lib/services/sortir.service';
import type { ScenarioKey } from '@/types/ai';

export function SavedAnalyses() {
  const saved = useSavedAnalyses();
  const router = useRouter();
  return (
    <div className="col gap-8">
      <h2 className="h3">Hasil AI Sortir tersimpan</h2>
      <p className="fine">Disimpan tanpa foto. Buka lagi untuk melihat langkah dan ide.</p>
      {saved.map((s) => (
        <div key={s.id} className="addr">
          <div className="col gap-4"><b>{s.title}</b><span className="fine">{s.date}</span></div>
          <div className="row gap-8">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { sortirService.openSaved(s.scen as ScenarioKey); router.push('/sortir'); }}>Buka</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { void sortirService.removeSaved(s.id); toast('Hasil dihapus', { kind: 'info' }); }}>Hapus</button>
          </div>
        </div>
      ))}
      {saved.length === 0 ? (
        <div className="empty">
          <h3 className="h3">Belum ada hasil tersimpan</h3>
          <p>Analisis barang di AI Sortir, lalu pilih “Simpan Hasil Analisis”.</p>
          <button type="button" className="btn btn-primary" onClick={() => router.push('/sortir')}>Buka AI Sortir</button>
        </div>
      ) : null}
    </div>
  );
}
