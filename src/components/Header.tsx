
import React from 'react';
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="py-4">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <div className="font-semibold text-xl">
            YourProject
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="/" className="hover:text-primary transition-colors">Home</a>
            <a href="#" className="hover:text-primary transition-colors">About</a>
            <a href="#" className="hover:text-primary transition-colors">Features</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </nav>
          <Button variant="ghost" className="md:hidden">
            Menu
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
