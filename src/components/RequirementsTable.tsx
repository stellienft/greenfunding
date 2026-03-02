import { CheckCircle2, X } from 'lucide-react';

interface RequirementRow {
  document: string;
  under500k: boolean;
  between500kAnd1m: boolean;
  over1m: boolean;
}

const requirements: RequirementRow[] = [
  {
    document: 'FY24 & FY25 Accountant prepared financials',
    under500k: true,
    between500kAnd1m: true,
    over1m: true
  },
  {
    document: 'Finance Commitment Schedule',
    under500k: true,
    between500kAnd1m: true,
    over1m: true
  },
  {
    document: 'Current ATO Portal Statement',
    under500k: true,
    between500kAnd1m: true,
    over1m: true
  },
  {
    document: 'Business Overview and Major Clients',
    under500k: true,
    between500kAnd1m: true,
    over1m: true
  },
  {
    document: 'Aged Debtors and Creditors',
    under500k: false,
    between500kAnd1m: true,
    over1m: true
  },
  {
    document: 'Cashflow Projections',
    under500k: false,
    between500kAnd1m: false,
    over1m: true
  }
];

export function RequirementsTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
        <thead>
          <tr className="bg-[#E8F5E9]">
            <th className="px-4 py-4 text-left text-sm font-semibold text-[#3A475B] border-b-2 border-[#28AA48]">
              Document
            </th>
            <th className="px-4 py-4 text-center text-sm font-semibold text-[#3A475B] border-b-2 border-[#28AA48]">
              &lt;$500,000
            </th>
            <th className="px-4 py-4 text-center text-sm font-semibold text-[#3A475B] border-b-2 border-[#28AA48]">
              $500,000-$1,000,000
            </th>
            <th className="px-4 py-4 text-center text-sm font-semibold text-[#3A475B] border-b-2 border-[#28AA48]">
              $1,000,000+
            </th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((req, index) => (
            <tr
              key={index}
              className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
            >
              <td className="px-4 py-4 text-sm text-[#3A475B] border-b border-gray-200">
                {req.document}
              </td>
              <td className="px-4 py-4 text-center border-b border-gray-200">
                {req.under500k ? (
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <X className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                )}
              </td>
              <td className="px-4 py-4 text-center border-b border-gray-200">
                {req.between500kAnd1m ? (
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <X className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                )}
              </td>
              <td className="px-4 py-4 text-center border-b border-gray-200">
                {req.over1m ? (
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <X className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
