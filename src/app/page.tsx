
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Phone, History, User, LogOut } from 'lucide-react';

export default function Home() {

          return (
            <main className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
              <div className="flex flex-col items-center text-center">
                <Image
                  src="/logo.png"
                  alt="Logo Séptima Compañía"
                  width={200}
                  height={200}
                  className="rounded-full mb-12 shadow-lg"
                  priority
                />

        <h1 className="text-4xl font-headline font-bold text-foreground mb-2">Listas</h1>
        <p className="text-lg text-muted-foreground mb-12">Séptima Compañía CBS.</p>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Button asChild size="lg" className="w-full justify-start px-6 py-8 text-lg">
            <Link href="/new-call">
              <Phone className="mr-4 h-6 w-6" />
              Nuevo llamado
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="w-full justify-start px-6 py-8 text-lg">
            <Link href="/calls">
              <History className="mr-4 h-6 w-6" />
              Ver otros llamados
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="w-full justify-start px-6 py-8 text-lg">
            <Link href="/volunteer">
              <User className="mr-4 h-6 w-6" />
              Ver Voluntarios
            </Link>
          </Button>
          <Button size="lg" variant="ghost" className="w-full justify-start px-6 py-8 text-lg text-muted-foreground">
            <LogOut className="mr-4 h-6 w-6" />
            Salir
          </Button>
        </div>
      </div>
    </main>
  );
}
