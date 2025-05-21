
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const Card = ({ title, icon, children, className }: CardProps) => {
  return (
    <div 
      className={cn(
        "bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-slide-in",
        className
      )}
    >
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-4">
          {icon && <div className="text-primary">{icon}</div>}
          {title && <h3 className="font-semibold text-neutral">{title}</h3>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
