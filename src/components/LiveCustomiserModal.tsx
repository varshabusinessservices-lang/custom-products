import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Upload,
  Check,
  Eye,
  Flame,
  Snowflake,
  Music,
  ShoppingBag,
  AlertCircle,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import { Product, ProductVariant, CustomisationValueInput } from '../../shared/types';

interface LiveCustomiserModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    variant: ProductVariant | undefined,
    customisationValues: CustomisationValueInput[],
    quantity: number
  ) => void;
}

export const LiveCustomiserModal: React.FC<LiveCustomiserModalProps> = ({
  product,
  onClose,
  onAddToCart,
}) => {
  const template = product.customisationTemplate;
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants[0]
  );

  // Initialize text values as empty so required validation is genuinely enforced
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (template) {
      for (const slot of template.slots) {
        if (slot.slotType === 'SELECT' && slot.options?.[0]) {
          initial[slot.slotKey] = slot.options[0];
        } else {
          initial[slot.slotKey] = '';
        }
      }
    }
    return initial;
  });

  // Photo slots start strictly EMPTY - no fake Unsplash previews or pre-filled strings!
  const [uploadedPhotos, setUploadedPhotos] = useState<Record<string, string>>({});
  const [photoMeta, setPhotoMeta] = useState<
    Record<string, { fileName: string; fileSizeKb: number }>
  >({});

  // Field-specific validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submissionAttempted, setSubmissionAttempted] = useState(false);

  // Interactive mockup toggles
  const [mugHotState, setMugHotState] = useState(true);

  // Refs for scrolling to first invalid input
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleTextChange = (slotKey: string, value: string) => {
    setCustomValues((prev) => ({ ...prev, [slotKey]: value }));
    if (fieldErrors[slotKey]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[slotKey];
        return next;
      });
    }
  };

  const handlePhotoSelect = (
    slotKey: string,
    allowedMimes: string[] | undefined,
    maxMb: number | undefined,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mimes = allowedMimes || ['image/jpeg', 'image/png', 'image/webp'];
    const maxBytes = (maxMb || 15) * 1024 * 1024;

    // 1. MIME Validation
    if (!mimes.includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        [slotKey]: `Unsupported file type (${file.type || 'unknown'}). Allowed: JPG, PNG, WebP.`,
      }));
      return;
    }

    // 2. Size Validation
    if (file.size > maxBytes) {
      setFieldErrors((prev) => ({
        ...prev,
        [slotKey]: `File exceeds ${maxMb || 15}MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller file.`,
      }));
      return;
    }

    // 3. Image Dimensions Check via Browser Image Element
    const previewUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.width < 100 || img.height < 100) {
        setFieldErrors((prev) => ({
          ...prev,
          [slotKey]: `Image resolution too low (${img.width}x${img.height}px). Minimum 100x100px required for print quality.`,
        }));
        URL.revokeObjectURL(previewUrl);
        return;
      }

      // Valid selection
      setUploadedPhotos((prev) => ({ ...prev, [slotKey]: previewUrl }));
      setPhotoMeta((prev) => ({
        ...prev,
        [slotKey]: {
          fileName: file.name,
          fileSizeKb: Math.round(file.size / 1024),
        },
      }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[slotKey];
        return next;
      });
    };

    img.onerror = () => {
      setFieldErrors((prev) => ({
        ...prev,
        [slotKey]: 'Could not read image file. Please select a valid picture.',
      }));
      URL.revokeObjectURL(previewUrl);
    };

    img.src = previewUrl;
  };

  const handleClearPhoto = (slotKey: string) => {
    if (uploadedPhotos[slotKey]) {
      URL.revokeObjectURL(uploadedPhotos[slotKey]);
    }
    setUploadedPhotos((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
    setPhotoMeta((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  };

  // Comprehensive slot validation before confirmation
  const validateAllSlots = (): boolean => {
    if (!template) return true;

    const errors: Record<string, string> = {};
    let firstInvalidKey: string | null = null;

    for (const slot of template.slots) {
      if (!slot.required) continue;

      if (slot.slotType === 'TEXT' || slot.slotType === 'DATE') {
        const val = customValues[slot.slotKey]?.trim() || '';
        if (!val) {
          errors[slot.slotKey] = `Please enter ${slot.label}.`;
          if (!firstInvalidKey) firstInvalidKey = slot.slotKey;
        } else if (slot.maxLength && val.length > slot.maxLength) {
          errors[slot.slotKey] = `Maximum ${slot.maxLength} characters allowed.`;
          if (!firstInvalidKey) firstInvalidKey = slot.slotKey;
        }
      } else if (slot.slotType === 'PHOTO') {
        const photo = uploadedPhotos[slot.slotKey];
        if (!photo) {
          errors[slot.slotKey] = `Please select an image file for '${slot.label}'.`;
          if (!firstInvalidKey) firstInvalidKey = slot.slotKey;
        }
      } else if (slot.slotType === 'SELECT') {
        const opt = customValues[slot.slotKey]?.trim();
        if (!opt) {
          errors[slot.slotKey] = `Please select an option for '${slot.label}'.`;
          if (!firstInvalidKey) firstInvalidKey = slot.slotKey;
        }
      }
    }

    setFieldErrors(errors);

    if (firstInvalidKey && slotRefs.current[firstInvalidKey]) {
      slotRefs.current[firstInvalidKey]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }

    return Object.keys(errors).length === 0;
  };

  const handleSaveAndAdd = () => {
    setSubmissionAttempted(true);
    const isValid = validateAllSlots();

    if (!isValid) {
      return;
    }

    const valuesArray: CustomisationValueInput[] = [];
    if (template) {
      for (const slot of template.slots) {
        if (slot.slotType === 'TEXT' || slot.slotType === 'DATE') {
          valuesArray.push({
            slotKey: slot.slotKey,
            textValue: customValues[slot.slotKey]?.trim() || '',
          });
        } else if (slot.slotType === 'PHOTO') {
          valuesArray.push({
            slotKey: slot.slotKey,
            photoUrl: uploadedPhotos[slot.slotKey] || '',
            fileName: photoMeta[slot.slotKey]?.fileName,
            fileSizeBytes: (photoMeta[slot.slotKey]?.fileSizeKb || 0) * 1024,
            isLocalPreview: true,
          });
        } else if (slot.slotType === 'SELECT') {
          valuesArray.push({
            slotKey: slot.slotKey,
            selectedOption: customValues[slot.slotKey] || slot.options?.[0] || '',
          });
        }
      }
    }

    onAddToCart(product, selectedVariant, valuesArray, 1);
    onClose();
  };

  // Price calculations
  const basePaisa = product.basePricePaisa;
  const variantAdditionalPaisa = selectedVariant?.additionalPaisa || 0;
  const totalItemPaisa = basePaisa + variantAdditionalPaisa;
  const totalRupees = Math.round(totalItemPaisa / 100);

  const errorCount = Object.keys(fieldErrors).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-auto border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-indigo-950 text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-amber-500 text-indigo-950 rounded">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base leading-tight">
                Live Customisation Studio
              </h2>
              <div className="text-[11px] text-indigo-200 truncate max-w-md">
                {product.title}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-300 hover:text-white p-1 rounded hover:bg-indigo-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Validation Alert Banner if errors exist */}
        {submissionAttempted && errorCount > 0 && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 flex items-center gap-2 text-rose-800 text-xs shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">
              Please complete all required fields ({errorCount} remaining) before confirming.
            </span>
          </div>
        )}

        {/* Studio Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left Column: Real-time Live Mockup Canvas */}
          <div className="md:col-span-7 bg-slate-100 p-4 sm:p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-indigo-800" />
              <span>Real-Time Craft Preview</span>
            </div>

            {/* Teak Wood Frame Real-Time Canvas */}
            {product.categorySlug === 'photo-frames' && (
              <div className="w-full max-w-md bg-amber-950 p-4 rounded-md shadow-2xl border-4 border-amber-900 relative">
                <div className="bg-amber-100/90 p-3 rounded shadow-inner">
                  {/* 3 Photos Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {/* Slot 1 */}
                    <div
                      className={`relative aspect-3/4 rounded overflow-hidden shadow-xs border flex items-center justify-center text-center p-1 ${
                        uploadedPhotos['photo_slot_1']
                          ? 'border-amber-900/20 bg-slate-200'
                          : fieldErrors['photo_slot_1']
                          ? 'border-rose-400 bg-rose-50 text-rose-700'
                          : 'border-dashed border-amber-900/40 bg-amber-50/60 text-slate-500'
                      }`}
                    >
                      {uploadedPhotos['photo_slot_1'] ? (
                        <>
                          <img
                            src={uploadedPhotos['photo_slot_1']}
                            alt="Left Slot"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1 rounded">
                            Photo 1
                          </span>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="w-4 h-4 mx-auto opacity-60" />
                          <span className="text-[10px] font-medium block leading-tight">
                            Left Photo
                            <br />
                            <span className="text-rose-600 font-bold">*Required</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Slot 2 (Hero) */}
                    <div
                      className={`relative aspect-3/4 rounded overflow-hidden shadow-xs border flex items-center justify-center text-center p-1 ${
                        uploadedPhotos['photo_slot_2']
                          ? 'border-amber-900/20 bg-slate-200'
                          : fieldErrors['photo_slot_2']
                          ? 'border-rose-400 bg-rose-50 text-rose-700'
                          : 'border-dashed border-amber-900/40 bg-amber-50/60 text-slate-500'
                      }`}
                    >
                      {uploadedPhotos['photo_slot_2'] ? (
                        <>
                          <img
                            src={uploadedPhotos['photo_slot_2']}
                            alt="Center Hero Slot"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1 rounded">
                            Photo 2 (Hero)
                          </span>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="w-4 h-4 mx-auto opacity-60" />
                          <span className="text-[10px] font-medium block leading-tight">
                            Center Photo
                            <br />
                            <span className="text-rose-600 font-bold">*Required</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Slot 3 */}
                    <div
                      className={`relative aspect-3/4 rounded overflow-hidden shadow-xs border flex items-center justify-center text-center p-1 ${
                        uploadedPhotos['photo_slot_3']
                          ? 'border-amber-900/20 bg-slate-200'
                          : fieldErrors['photo_slot_3']
                          ? 'border-rose-400 bg-rose-50 text-rose-700'
                          : 'border-dashed border-amber-900/40 bg-amber-50/60 text-slate-500'
                      }`}
                    >
                      {uploadedPhotos['photo_slot_3'] ? (
                        <>
                          <img
                            src={uploadedPhotos['photo_slot_3']}
                            alt="Right Slot"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1 rounded">
                            Photo 3
                          </span>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="w-4 h-4 mx-auto opacity-60" />
                          <span className="text-[10px] font-medium block leading-tight">
                            Right Photo
                            <br />
                            <span className="text-rose-600 font-bold">*Required</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Engraved Plaque at Bottom of Frame */}
                  <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 text-amber-200 py-2 px-3 rounded text-center border border-amber-700/80 shadow-inner">
                    <div className="font-serif font-black text-sm tracking-wider uppercase drop-shadow-xs">
                      {customValues['family_title']?.trim() || (
                        <span className="text-amber-400/50 italic font-normal text-xs">
                          (Type engraved title on right)
                        </span>
                      )}
                    </div>
                    {customValues['special_year']?.trim() && (
                      <div className="font-serif text-[11px] text-amber-300/90 tracking-widest mt-0.5">
                        {customValues['special_year']}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-amber-300 text-center mt-2 flex items-center justify-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Custom Laser Engraved Teak Finish</span>
                </div>
              </div>
            )}

            {/* Magic Photo Mug Live Interactive Reveal Mockup */}
            {product.categorySlug === 'photo-mugs' && (
              <div className="w-full max-w-sm flex flex-col items-center">
                <div
                  className={`relative w-48 h-56 rounded-3xl border-8 border-slate-800 transition-all duration-700 p-2 flex flex-col justify-center items-center shadow-2xl ${
                    mugHotState
                      ? 'bg-gradient-to-br from-indigo-50 to-white'
                      : 'bg-slate-900 text-slate-600'
                  }`}
                >
                  <div className="absolute -right-7 top-10 w-7 h-28 border-6 border-slate-800 rounded-r-2xl" />

                  {mugHotState ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
                      {uploadedPhotos['photo_upload'] ? (
                        <img
                          src={uploadedPhotos['photo_upload']}
                          alt="Mug Photo"
                          className="w-24 h-24 rounded-full object-cover border-2 border-amber-500 shadow-md mb-2"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-[10px] text-slate-400 p-1 mb-2">
                          <Upload className="w-4 h-4 mb-0.5" />
                          <span>Photo Needed</span>
                        </div>
                      )}
                      <div className="font-bold text-slate-800 text-xs px-2 line-clamp-2">
                        {customValues['custom_message']?.trim() || '(Secret note text)'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-3">
                      <div className="text-slate-500 text-xs font-medium">Matte Black Shield</div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        Pour hot beverage to reveal your photo &amp; note
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-300 shadow-xs text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setMugHotState(false)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors ${
                      !mugHotState ? 'bg-sky-100 text-sky-800 font-bold' : 'text-slate-500'
                    }`}
                  >
                    <Snowflake className="w-3.5 h-3.5 text-sky-500" />
                    <span>Cold (Black)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMugHotState(true)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors ${
                      mugHotState ? 'bg-amber-100 text-amber-900 font-bold' : 'text-slate-500'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    <span>Hot Chai (Revealed)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Spotify Code Keychain */}
            {product.categorySlug === 'custom-keychains' && (
              <div className="w-full max-w-sm flex flex-col items-center">
                <div
                  className={`w-28 h-64 rounded-xl shadow-2xl p-3 flex flex-col justify-between items-center border-2 transition-all ${
                    selectedVariant?.attributeValue === 'Stealth Black'
                      ? 'bg-slate-900 text-white border-slate-700'
                      : selectedVariant?.attributeValue === '18K Gold Plated'
                      ? 'bg-gradient-to-b from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-400'
                      : 'bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 text-slate-800 border-slate-300'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full border-2 border-current mt-1" />

                  <div className="w-full text-center space-y-2">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold">
                      <Music className="w-3.5 h-3.5" />
                      <span>SPOTIFY CODE</span>
                    </div>

                    <div className="flex items-center justify-center gap-0.5 h-8 px-2">
                      {[12, 24, 18, 30, 22, 14, 28, 16, 26, 19, 10, 24, 15].map((h, i) => (
                        <div
                          key={i}
                          style={{ height: `${h}px` }}
                          className="w-1 bg-current rounded-full"
                        />
                      ))}
                    </div>

                    <div className="text-[10px] font-semibold truncate px-1">
                      {customValues['song_title']?.trim() || 'Song Title & Artist'}
                    </div>
                  </div>

                  <div className="text-[9px] text-center font-mono opacity-80 pb-1">
                    {customValues['back_engraving']?.trim() || 'Engraved Date'}
                  </div>
                </div>
              </div>
            )}

            {/* Cushions & Wall Art Fallback */}
            {product.categorySlug !== 'photo-frames' &&
              product.categorySlug !== 'photo-mugs' &&
              product.categorySlug !== 'custom-keychains' && (
                <div className="w-full max-w-sm rounded-lg overflow-hidden shadow-xl border-4 border-white bg-slate-900 relative aspect-square flex items-center justify-center">
                  {uploadedPhotos['photo_upload'] ||
                  uploadedPhotos['canvas_photo'] ||
                  uploadedPhotos['photo_cover'] ? (
                    <img
                      src={
                        uploadedPhotos['photo_upload'] ||
                        uploadedPhotos['canvas_photo'] ||
                        uploadedPhotos['photo_cover']
                      }
                      alt="Custom preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-4 text-center text-slate-400 space-y-2">
                      <Upload className="w-8 h-8 mx-auto opacity-50" />
                      <div className="text-xs font-semibold">Upload photo to preview on canvas</div>
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Right Column: Customisation Inputs & File Selection */}
          <div className="md:col-span-5 p-4 sm:p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Variant Selector */}
              {product.variants.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                    Select Variant / Option:
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`px-3 py-2 text-xs rounded border text-left flex items-center justify-between transition-colors ${
                          selectedVariant?.id === v.id
                            ? 'border-indigo-950 bg-indigo-50 font-bold text-indigo-950 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <span>{v.title}</span>
                        {v.additionalPaisa > 0 ? (
                          <span className="text-amber-700 font-semibold">
                            +₹{Math.round(v.additionalPaisa / 100)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 text-[10px] font-bold">Standard</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Customisation Slots Form with Strict Validation */}
              {template?.slots && template.slots.length > 0 && (
                <div className="space-y-3.5 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Required Customisation:
                    </span>
                    <span className="text-[11px] text-slate-500">
                      * Required fields must be completed
                    </span>
                  </div>

                  {template.slots.map((slot) => {
                    const hasError = Boolean(fieldErrors[slot.slotKey]);

                    // Text / Date slot
                    if (slot.slotType === 'TEXT' || slot.slotType === 'DATE') {
                      return (
                        <div
                          key={slot.slotKey}
                          ref={(el) => {
                            slotRefs.current[slot.slotKey] = el;
                          }}
                          className="space-y-1"
                        >
                          <label className="block text-xs font-semibold text-slate-800">
                            {slot.label} {slot.required && <span className="text-rose-600">*</span>}
                          </label>
                          <input
                            type="text"
                            value={customValues[slot.slotKey] || ''}
                            onChange={(e) => handleTextChange(slot.slotKey, e.target.value)}
                            placeholder={slot.placeholder || 'Enter text...'}
                            maxLength={slot.maxLength || 60}
                            className={`w-full text-xs px-3 py-2 border rounded focus:outline-none transition-colors ${
                              hasError
                                ? 'border-rose-500 bg-rose-50/50 focus:ring-1 focus:ring-rose-500 text-rose-950'
                                : 'border-slate-300 focus:ring-1 focus:ring-indigo-900 bg-white'
                            }`}
                          />
                          {hasError ? (
                            <div className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span>{fieldErrors[slot.slotKey]}</span>
                            </div>
                          ) : slot.helpText ? (
                            <span className="text-[10px] text-slate-400 block">
                              {slot.helpText}
                            </span>
                          ) : null}
                        </div>
                      );
                    }

                    // Photo Upload slot (Must be an actual user-selected file)
                    if (slot.slotType === 'PHOTO') {
                      const photoUrl = uploadedPhotos[slot.slotKey];
                      const meta = photoMeta[slot.slotKey];

                      return (
                        <div
                          key={slot.slotKey}
                          ref={(el) => {
                            slotRefs.current[slot.slotKey] = el;
                          }}
                          className={`p-3 rounded-lg border transition-all ${
                            hasError
                              ? 'border-rose-400 bg-rose-50/60'
                              : photoUrl
                              ? 'border-emerald-300 bg-emerald-50/40'
                              : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-800">
                              {slot.label} {slot.required && <span className="text-rose-600">*</span>}
                            </label>
                            {photoUrl && (
                              <button
                                type="button"
                                onClick={() => handleClearPhoto(slot.slotKey)}
                                className="text-[11px] text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Change File</span>
                              </button>
                            )}
                          </div>

                          {photoUrl ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <img
                                  src={photoUrl}
                                  alt="Preview"
                                  className="w-10 h-10 rounded object-cover border border-emerald-300"
                                />
                                <div className="text-xs text-slate-700 min-w-0">
                                  <div className="font-semibold truncate">
                                    {meta?.fileName || 'Image selected'}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {meta?.fileSizeKb} KB · Local preview ready
                                  </div>
                                </div>
                              </div>
                              <div className="text-[10px] text-slate-500 bg-white/80 p-1.5 rounded border border-slate-200">
                                File loaded into local session. Permanent storage wired upon Phase 2.
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <label className="w-full py-2 px-3 bg-white border border-slate-300 hover:border-indigo-950 rounded text-xs font-semibold text-slate-700 cursor-pointer flex items-center justify-center gap-2 transition-colors shadow-xs active:bg-slate-50">
                                <Upload className="w-3.5 h-3.5 text-indigo-900" />
                                <span>Choose Image File from Device</span>
                                <input
                                  type="file"
                                  accept={slot.allowedMimes?.join(',') || 'image/jpeg,image/png,image/webp'}
                                  onChange={(e) =>
                                    handlePhotoSelect(
                                      slot.slotKey,
                                      slot.allowedMimes,
                                      slot.maxFileSizeMb,
                                      e
                                    )
                                  }
                                  className="hidden"
                                />
                              </label>
                              <div className="text-[10px] text-slate-400">
                                {slot.helpText || 'Supported: JPG, PNG, WebP up to 15MB.'}
                              </div>
                            </div>
                          )}

                          {hasError && (
                            <div className="mt-1.5 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{fieldErrors[slot.slotKey]}</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Select slot
                    if (slot.slotType === 'SELECT' && slot.options) {
                      return (
                        <div key={slot.slotKey} className="space-y-1">
                          <label className="block text-xs font-semibold text-slate-800">
                            {slot.label} {slot.required && <span className="text-rose-600">*</span>}
                          </label>
                          <select
                            value={customValues[slot.slotKey] || slot.options[0]}
                            onChange={(e) => handleTextChange(slot.slotKey, e.target.value)}
                            className="w-full text-xs px-3 py-2 border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-900"
                          >
                            {slot.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>

            {/* Price Breakdown & Add to Cart Action */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-slate-500">Authoritative Calculated Price</div>
                  <div className="text-xl font-black text-indigo-950">
                    ₹{totalRupees.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-600">
                  <div>Complimentary Engraving</div>
                  <div>GST 18% Inclusive</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveAndAdd}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-indigo-950 font-black text-sm rounded shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Confirm Customisation &amp; Add to Cart</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
