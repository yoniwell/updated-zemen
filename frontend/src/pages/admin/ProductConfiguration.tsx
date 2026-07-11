import { Button } from '@/components/ui/button';
import DataTable from '@/components/admin/DataTable';
import { toast } from 'sonner';
import { useAdminI18n } from '@/lib/uiI18n';

const loanProducts = [
  ['Personal Development Loan', '100,000 ETB', '36 months', '12%'],
  ['Business & Trade Loan', '500,000 ETB', '60 months', '14%'],
  ['Salary-Backed Loan', '200,000 ETB', '48 months', '10%'],
  ['Emergency Support Loan', '30,000 ETB', '12 months', '8%'],
  ['Asset & Equipment Loan', '1,000,000 ETB', '60 months', '15%'],
];

const membershipTypes = [
  ['Individual'],
  ['Joint'],
  ['Youth'],
  ['Institutional'],
];

export default function ProductConfiguration() {
  const { tAdmin } = useAdminI18n();
  const handleEditProduct = (productName: string) => {
    toast.success(tAdmin('editingProductPanelNextUpdate', 'Editing {{productName}}. Product editor panel will open in the next update.', { productName }));
  };

  const handleEditMembershipType = (typeName: string) => {
    toast.success(tAdmin('editingMembershipType', 'Editing membership type: {{typeName}}.', { typeName }));
  };

  const handleAddProduct = () => {
    toast.success(tAdmin('addProductFlowStarted', 'Add Product flow started.'));
  };

  const loanProductRows = loanProducts.map(([product, maxAmount, maxTerm, rate]) => [
    product,
    maxAmount,
    maxTerm,
    rate,
    <Button key={`${product}-edit`} variant="outline" size="sm" onClick={() => handleEditProduct(product)}>
      {tAdmin('edit', 'Edit')}
    </Button>,
  ]);

  const membershipRows = membershipTypes.map(([typeName]) => [
    typeName,
    <Button key={`${typeName}-edit`} variant="outline" size="sm" onClick={() => handleEditMembershipType(typeName)}>
      {tAdmin('edit', 'Edit')}
    </Button>,
  ]);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl text-foreground">{tAdmin('productConfiguration', 'Product Configuration')}</h1>
        <p className="text-sm text-muted-foreground">{tAdmin('maintainLoanProductsMembershipSetup', 'Maintain loan products and membership type setup.')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <article className="rounded-lg bg-white p-4">
          <p className="text-xs font-black uppercase text-slate-500">{tAdmin('personal', 'Personal')}</p>
          <p className="mt-2 text-sm text-slate-700">{tAdmin('productCardPersonalSummary', 'Rate 12.5% | Max ETB 5M')}</p>
        </article>
        <article className="rounded-lg bg-white p-4">
          <p className="text-xs font-black uppercase text-slate-500">SME</p>
          <p className="mt-2 text-sm text-slate-700">{tAdmin('productCardSmeSummary', 'Rate 14.0% | Max ETB 15M')}</p>
        </article>
        <article className="rounded-lg bg-white p-4">
          <p className="text-xs font-black uppercase text-slate-500">{tAdmin('emergency', 'Emergency')}</p>
          <p className="mt-2 text-sm text-slate-700">{tAdmin('productCardEmergencySummary', 'Rate 18.5% | Max ETB 200K')}</p>
        </article>
      </div>

      <div className="rounded-lg bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">{tAdmin('loanProducts', 'Loan Products')}</p>
          <button className="rounded bg-blue-700 px-3 py-1 text-[10px] font-black uppercase text-white" onClick={handleAddProduct}>{tAdmin('addProduct', 'Add Product')}</button>
        </div>
        <DataTable headers={[tAdmin('product', 'Product'), tAdmin('maxAmount', 'Max Amount'), tAdmin('maxTerm', 'Max Term'), tAdmin('rate', 'Rate'), tAdmin('action', 'Action')]} rows={loanProductRows} />
      </div>

      <div className="rounded-lg bg-white p-4">
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">{tAdmin('membershipTypes', 'Membership Types')}</p>
        <DataTable headers={[tAdmin('type', 'Type'), tAdmin('action', 'Action')]} rows={membershipRows} />
      </div>
    </section>
  );
}
