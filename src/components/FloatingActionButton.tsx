
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const FloatingActionButton = () => {
  return (
    <Link
      to="/nova-transacao"
      className={cn(
        "fixed bottom-5 right-5 z-10",
        "w-14 h-14 rounded-full bg-primary shadow-lg",
        "flex items-center justify-center text-white",
        "hover:bg-primary/90 transition-colors",
        "animate-fade-in"
      )}
      aria-label="Nova transação"
    >
      <Plus size={24} />
    </Link>
  );
};

export default FloatingActionButton;
