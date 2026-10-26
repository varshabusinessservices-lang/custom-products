import React, { useState } from 'react';
import { MapPin, X, CheckCircle, Truck, Clock } from 'lucide-react';
import { IndianPincodeInfo } from '../../shared/types';
import { lookupPincode, FIXTURE_PINCODES } from '../../shared/fixtures';

interface PincodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPincode: IndianPincodeInfo;
  onSelectPincode: (info: IndianPincodeInfo) => void;
}

export const PincodeModal: React.FC<PincodeModalProps> = ({
  isOpen,
  onClose,
  currentPincode,
  onSelectPincode,
}) => {
  const [pinInput, setPinInput] = useState(currentPincode.pincode);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pinInput.trim();
    if (!/^[1-9][0-9]{5}$/.test(clean)) {
      setErrorMsg('Please enter a valid 6-digit Indian postal pincode.');
      return;
    }

    const info = lookupPincode(clean);
    if (!info.isDeliverable) {
      setErrorMsg('Delivery currently unavailable to this postal code.');
      return;
    }

    onSelectPincode(info);
    setErrorMsg(null);
    onClose();
  };

  const handleQuickSelect = (pin: string) => {
    const info = lookupPincode(pin);
    onSelectPincode(info);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm">Select Delivery Location</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleVerify} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enter Indian Postal Code (6 Digits):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setErrorMsg(null);
                }}
                maxLength={6}
                placeholder="e.g. 110001"
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-900"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-950 hover:bg-indigo-900 text-white font-bold text-xs rounded transition-colors"
              >
                Check
              </button>
            </div>
            {errorMsg && <div className="text-xs text-rose-600 mt-1">{errorMsg}</div>}
          </div>

          <div className="pt-3 border-t border-slate-200">
            <div className="text-xs font-semibold text-slate-600 mb-2">
              Popular Cities &amp; Express Hubs:
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {Object.values(FIXTURE_PINCODES).map((info) => (
                <button
                  key={info.pincode}
                  type="button"
                  onClick={() => handleQuickSelect(info.pincode)}
                  className={`p-2 rounded border text-left transition-colors ${
                    currentPincode.pincode === info.pincode
                      ? 'border-indigo-950 bg-indigo-50 font-bold text-indigo-950'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-semibold text-slate-900">{info.city}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {info.pincode} · {info.standardDays}d Delivery
                  </div>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
