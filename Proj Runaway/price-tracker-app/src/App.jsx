import React, { useState, useMemo } from 'react';
import { Package, MapPin, Truck, IndianRupee, Scale, Zap } from 'lucide-react';

// --- Carrier Data & Logic ---
const CARRIERS = [
  { id: 'delhivery', name: 'Delhivery', type: 'Courier', base: 90, extra: 20, fsc: 0.12, codMin: 40, codPct: 0.02, eta: '3-5 days' },
  { id: 'xpressbees', name: 'Xpressbees', type: 'Courier', base: 85, extra: 18, fsc: 0.12, codMin: 40, codPct: 0.02, eta: '3-6 days' },
  { id: 'shiprocket', name: 'Shiprocket', type: 'Aggregator', base: 95, extra: 25, fsc: 0.10, codMin: 40, codPct: 0.02, eta: '3-5 days' },
  { id: 'shadowfax', name: 'Shadowfax', type: 'Courier', base: 70, extra: 15, fsc: 0.10, codMin: 40, codPct: 0.02, eta: '4-7 days' },
  { id: 'ecom', name: 'Ecom Express', type: 'Courier', base: 75, extra: 18, fsc: 0.12, codMin: 41, codPct: 0.03, eta: '3-5 days' },
  { id: 'bluedart', name: 'Blue Dart (DHL)', type: 'Premium', base: 180, extra: 40, fsc: 0.15, codMin: 50, codPct: 0.025, eta: '1-3 days' },
  { id: 'ekart', name: 'Ekart Logistics', type: 'Courier', base: 87, extra: 20, fsc: 0.12, codMin: 40, codPct: 0.02, eta: '3-5 days' },
  { id: 'nimbus', name: 'NimbusPost', type: 'Aggregator', base: 85, extra: 22, fsc: 0.10, codMin: 30, codPct: 0.02, eta: '3-5 days' },
  { id: 'trackon', name: 'Trackon Couriers', type: 'Regional', base: 80, extra: 15, fsc: 0.10, codMin: 40, codPct: 0.02, eta: '4-6 days' },
];

const getScaleDiscount = (volume) => {
  if (volume <= 50) return 0;
  if (volume <= 200) return 0.07;
  if (volume <= 1000) return 0.15;
  return 0.25;
};

export default function LogisticsDashboard() {
  // --- State ---
  const [originPin, setOriginPin] = useState('302001');
  const [destPin, setDestPin] = useState('110001');
  const [weight, setWeight] = useState(1);
  const [length, setLength] = useState(30);
  const [width, setWidth] = useState(30);
  const [height, setHeight] = useState(20);
  const [invoiceValue, setInvoiceValue] = useState(1000);
  const [volume, setVolume] = useState(100);
  const [isCOD, setIsCOD] = useState(false);

  // --- Core Math Calculations ---
  const volumetricWeight = useMemo(() => {
    return (length * width * height) / 5000;
  }, [length, width, height]);

  const chargeableWeight = useMemo(() => {
    const cw = Math.max(weight, volumetricWeight);
    return Math.ceil(cw * 2) / 2; // Round up to nearest 0.5
  }, [weight, volumetricWeight]);

  const scaleDiscountPct = getScaleDiscount(volume);

  const rates = useMemo(() => {
    return CARRIERS.map(carrier => {
      // 1. Base + Extra Weight Calculation (Assuming base covers first 1kg, extra is per 0.5kg after 1kg)
      let freight = carrier.base;
      if (chargeableWeight > 1) {
        const extraSlices = (chargeableWeight - 1) / 0.5;
        freight += extraSlices * carrier.extra;
      }

      // 2. Scale Discount
      const discountVal = freight * scaleDiscountPct;
      const discountedFreight = freight - discountVal;

      // 3. Fuel Surcharge
      const fscVal = discountedFreight * carrier.fsc;

      // 4. COD Fee
      let codVal = 0;
      if (isCOD) {
        codVal = Math.max(carrier.codMin, invoiceValue * carrier.codPct);
      }

      // 5. GST (18%)
      const subtotal = discountedFreight + fscVal + codVal;
      const gstVal = subtotal * 0.18;

      // Total
      const total = subtotal + gstVal;

      return {
        ...carrier,
        freight: discountedFreight.toFixed(2),
        fsc: fscVal.toFixed(2),
        cod: codVal.toFixed(2),
        gst: gstVal.toFixed(2),
        total: Math.round(total)
      };
    }).sort((a, b) => a.total - b.total); // Sort by cheapest
  }, [chargeableWeight, scaleDiscountPct, isCOD, invoiceValue]);

  // --- UI Render ---
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT PANEL: INPUTS */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              Shipment Details
            </h2>

            {/* Pincodes */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Origin PIN</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
                  <input type="text" value={originPin} onChange={e => setOriginPin(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Dest PIN</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
                  <input type="text" value={destPin} onChange={e => setDestPin(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* Weight & Value */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Actual Weight (kg)</label>
                <input type="number" step="0.1" value={weight} onChange={e => setWeight(parseFloat(e.target.value) || 0)} className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-sm focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Invoice Value (₹)</label>
                <input type="number" value={invoiceValue} onChange={e => setInvoiceValue(parseFloat(e.target.value) || 0)} className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-sm focus:border-indigo-500 outline-none" />
              </div>
            </div>

            {/* Dimensions */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">Dimensions (L × W × H in cm)</label>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" value={length} onChange={e => setLength(parseFloat(e.target.value) || 0)} placeholder="L" className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-sm text-center focus:border-indigo-500 outline-none" />
                <input type="number" value={width} onChange={e => setWidth(parseFloat(e.target.value) || 0)} placeholder="W" className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-sm text-center focus:border-indigo-500 outline-none" />
                <input type="number" value={height} onChange={e => setHeight(parseFloat(e.target.value) || 0)} placeholder="H" className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-sm text-center focus:border-indigo-500 outline-none" />
              </div>
            </div>

            {/* Volume */}
            <div className="mb-6">
              <label className="block text-xs text-gray-400 mb-1">Monthly Order Volume</label>
              <input type="number" value={volume} onChange={e => setVolume(parseFloat(e.target.value) || 0)} className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-sm focus:border-indigo-500 outline-none mb-1" />
              <div className="text-xs text-indigo-400">{(scaleDiscountPct * 100)}% Volume Discount Active</div>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">Payment Mode</label>
              <div className="flex gap-2 p-1 bg-gray-950 rounded-lg border border-gray-800">
                <button onClick={() => setIsCOD(false)} className={`flex-1 py-2 text-sm rounded-md transition-colors ${!isCOD ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>Prepaid</button>
                <button onClick={() => setIsCOD(true)} className={`flex-1 py-2 text-sm rounded-md transition-colors ${isCOD ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>COD</button>
              </div>
            </div>
          </div>

          {/* Logic Breakdown Box */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-300">
              <Scale className="w-4 h-4" /> Physics Math
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Actual Weight</span><span>{weight} kg</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Volumetric Weight</span><span>{volumetricWeight.toFixed(2)} kg</span></div>
              <div className="border-t border-gray-800 my-2 pt-2 flex justify-between font-bold text-indigo-400">
                <span>Chargeable Weight</span><span>{chargeableWeight} kg</span>
              </div>
              {volumetricWeight > weight && (
                <div className="mt-2 text-xs text-amber-500 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                  Volumetric penalty applied. You are paying for {chargeableWeight}kg due to box size.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: RESULTS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Highlights */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-5 shadow-xl flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg"><IndianRupee className="w-6 h-6" /></div>
              <div>
                <p className="text-xs text-emerald-500/80 font-medium uppercase tracking-wider mb-1">Cheapest Option</p>
                <p className="text-xl font-bold text-emerald-400">{rates[0].name}</p>
                <p className="text-sm text-gray-400">₹{rates[0].total} • {rates[0].eta}</p>
              </div>
            </div>
            <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-5 shadow-xl flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg"><Zap className="w-6 h-6" /></div>
              <div>
                <p className="text-xs text-blue-500/80 font-medium uppercase tracking-wider mb-1">Fastest Option</p>
                <p className="text-xl font-bold text-blue-400">Blue Dart</p>
                <p className="text-sm text-gray-400">1-3 days</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-400" />
                Live Rate Comparison
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-950/50 text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-4 font-medium">Provider</th>
                    <th className="p-4 font-medium text-right">Base</th>
                    <th className="p-4 font-medium text-right">FSC</th>
                    {isCOD && <th className="p-4 font-medium text-right text-amber-500">COD Fee</th>}
                    <th className="p-4 font-medium text-right">GST</th>
                    <th className="p-4 font-medium text-right text-indigo-400">Total (₹)</th>
                    <th className="p-4 font-medium text-right">ETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {rates.map((rate, idx) => (
                    <tr key={rate.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-200">{rate.name}</div>
                        <div className="text-xs text-gray-500">{rate.type}</div>
                      </td>
                      <td className="p-4 text-right text-gray-400">₹{rate.freight}</td>
                      <td className="p-4 text-right text-gray-400">₹{rate.fsc}</td>
                      {isCOD && <td className="p-4 text-right text-amber-500/80">₹{rate.cod}</td>}
                      <td className="p-4 text-right text-gray-400">₹{rate.gst}</td>
                      <td className="p-4 text-right font-bold text-indigo-400 text-base">₹{rate.total}</td>
                      <td className="p-4 text-right text-gray-400">{rate.eta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}