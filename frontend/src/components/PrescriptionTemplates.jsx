import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiFileText, FiX, FiChevronDown } from 'react-icons/fi';
import templatesData from '../data/prescription-templates.json';

const PrescriptionTemplates = ({ onSelectTemplate, disabled = false }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { value: 'all', label: 'All Templates', labelAr: 'جميع القوالب', labelFr: 'Tous les modèles' },
    { value: 'Chronic', label: 'Chronic Conditions', labelAr: 'الحالات المزمنة', labelFr: 'Maladies chroniques' },
    { value: 'Acute', label: 'Acute Conditions', labelAr: 'الحالات الحادة', labelFr: 'Maladies aiguës' },
    { value: 'Seasonal', label: 'Seasonal', labelAr: 'موسمي', labelFr: 'Saisonnier' }
  ];

  const getLocalizedName = (template) => {
    if (i18n.language === 'ar' && template.nameAr) return template.nameAr;
    if (i18n.language === 'fr' && template.nameFr) return template.nameFr;
    return template.name;
  };

  const getCategoryLabel = (category) => {
    const cat = categories.find(c => c.value === category);
    if (!cat) return category;
    if (i18n.language === 'ar') return cat.labelAr;
    if (i18n.language === 'fr') return cat.labelFr;
    return cat.label;
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? templatesData 
    : templatesData.filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (template) => {
    onSelectTemplate(template);
    setIsOpen(false);
  };

  return (
    <div className="relative z-[150]">
      {/* Template Selector Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl shadow-sm transition-all ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 hover:shadow-md'
        }`}
        title={disabled ? 'Clear form to use templates' : 'Use prescription template'}
      >
        <FiFileText className="h-4 w-4" />
        <span>Common Prescriptions</span>
        <FiChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Modal */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute top-full left-0 mt-2 w-[480px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-slate-200 z-[9999] overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                Common Prescription Templates
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {/* Category Filter */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex gap-2 flex-wrap">
                {categories.map(category => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      selectedCategory === category.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {getCategoryLabel(category.value)}
                  </button>
                ))}
              </div>
            </div>

            {/* Templates List */}
            <div className="max-h-96 overflow-y-auto">
              {filteredTemplates.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  No templates found in this category
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors group"
                    >
                      {/* Template Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                            {getLocalizedName(template)}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {template.diagnosis}
                          </p>
                        </div>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                          template.category === 'Chronic' 
                            ? 'bg-purple-100 text-purple-700'
                            : template.category === 'Acute'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {template.category}
                        </span>
                      </div>

                      {/* Medications Preview */}
                      <div className="mt-2 space-y-1">
                        {template.medications.slice(0, 2).map((med, idx) => (
                          <div key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                            <span>{med.name}</span>
                          </div>
                        ))}
                        {template.medications.length > 2 && (
                          <div className="text-xs text-gray-400">
                            +{template.medications.length - 2} more medication(s)
                          </div>
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">{template.medications.length}</span> medication(s)
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium">{template.maxDispenses}</span> dispense(s)
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Note */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Based on Moroccan CNSS drug database
                </span>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PrescriptionTemplates;

