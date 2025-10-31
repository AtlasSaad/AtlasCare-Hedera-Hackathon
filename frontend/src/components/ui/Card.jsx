const Card = ({ children, className = '', hover = false }) => {
  return (
    <div 
      className={`bg-white/80 backdrop-blur rounded-2xl shadow-lg ring-1 ring-slate-900/5 ${
        hover ? 'transition-all hover:shadow-xl hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-5 border-b border-gray-200 ${className}`}>
      {children}
    </div>
  );
};

const CardBody = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-5 ${className}`}>
      {children}
    </div>
  );
};

const CardFooter = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 bg-gray-50 border-t border-gray-200 ${className}`}>
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;

