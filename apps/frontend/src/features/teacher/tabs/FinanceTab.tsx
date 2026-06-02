import { Wallet, Receipt } from 'lucide-react';
import { BentoGrid, BentoTile } from '../components/BentoGrid';
import { EmptyState } from '../components/EmptyState';

/** Finance & Ledger — placeholder; ledger entries wired in a later task. */
export function FinanceTab() {
  return (
    <BentoGrid>
      <BentoTile size="1x1" title="מאזן" english="Balance" icon={<Wallet size={16} />}>
        <EmptyState icon={<Wallet size={24} />} message="אין נתונים כספיים עדיין." />
      </BentoTile>
      <BentoTile size="2x2" title="תנועות" english="Ledger" icon={<Receipt size={16} />}>
        <EmptyState icon={<Receipt size={26} />} message="התנועות הכספיות יוצגו כאן." />
      </BentoTile>
    </BentoGrid>
  );
}
