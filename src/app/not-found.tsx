import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { PageState } from "@/components/site/page-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main id="main" className="flex flex-1">
        <PageState icon={<FileQuestion size={23} aria-hidden />} title="Page not found" description="The page you were looking for couldn’t be found.">
          <Button asChild><Link href="/tools">Browse tools</Link></Button>
        </PageState>
      </main>
      <Footer />
    </>
  );
}
