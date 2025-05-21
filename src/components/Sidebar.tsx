import { NavLink } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Home, CreditCard, CalendarMinus, Wallet, ListChecks } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
const NAV_ITEMS = [{
  title: "Início",
  icon: <Home size="18" />,
  path: "/"
}, {
  title: "Transações",
  icon: <CreditCard size="18" />,
  path: "/transacoes"
}, {
  title: "Contas a Pagar",
  icon: <CalendarMinus size="18" />,
  path: "/contas-a-pagar"
}, {
  title: "Categorias",
  icon: <ListChecks size="18" />,
  path: "/categorias"
}, {
  title: "Contas",
  icon: <Wallet size="18" />,
  path: "/contas"
}];
const Sidebar = () => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  if (isMobile) {
    return <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild className="absolute left-4 top-4">
          <Button variant="outline" size="icon">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[250px] p-0">
          <nav className="h-full w-full flex flex-col bg-white">
            <div className="p-4 mb-4 border-b">
              <h1 className="font-bold text-xl text-primary">Finançãs</h1>
              <p className="text-sm text-gray-500">Gerencie suas finanças</p>
            </div>

            <div className="px-2 flex-grow">
              <ul className="space-y-1">
                {NAV_ITEMS.map(item => <li key={item.path}>
                    <NavLink to={item.path} onClick={() => setIsOpen(false)} className={({
                  isActive
                }) => `flex items-center px-3 py-2 rounded-md text-sm ${isActive ? "bg-primary text-white" : "hover:bg-gray-100"}`} end={item.path === "/"}>
                      <span className="mr-3">{item.icon}</span>
                      {item.title}
                    </NavLink>
                  </li>)}
              </ul>
            </div>
          </nav>
        </SheetContent>
      </Sheet>;
  }
  return <aside className="border-r w-[240px] min-w-[240px] h-full bg-white">
      <nav className="h-full w-full flex flex-col">
        <div className="p-4 mb-4 border-b">
          <h1 className="font-bold text-xl text-primary">Vibe Financas Pro</h1>
          <p className="text-sm text-gray-500">Gerencie suas finanças</p>
        </div>

        <div className="px-2 flex-grow">
          <ul className="space-y-1">
            {NAV_ITEMS.map(item => <li key={item.path}>
                <NavLink to={item.path} className={({
              isActive
            }) => `flex items-center px-3 py-2 rounded-md text-sm ${isActive ? "bg-primary text-white" : "hover:bg-gray-100"}`} end={item.path === "/"}>
                  <span className="mr-3">{item.icon}</span>
                  {item.title}
                </NavLink>
              </li>)}
          </ul>
        </div>
      </nav>
    </aside>;
};
export default Sidebar;