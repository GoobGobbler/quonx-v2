
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col h-screen">
       <header className="p-4 border-b bg-card">
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-4 w-48" />
      </header>

       <main className="flex-grow flex flex-col lg:flex-row overflow-hidden p-4 gap-4">
        {/* Left Side: Prompt Input Skeleton */}
        <div className="lg:w-1/3 flex flex-col gap-4">
           <div className="flex-shrink-0 space-y-4">
            <div className="grid w-full gap-1.5">
                <Skeleton className="h-4 w-40 mb-1" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-4 w-60" />
            </div>
            <Skeleton className="h-10 w-full sm:w-32" />
           </div>
        </div>

         <div className="hidden lg:block mx-2">
           <Skeleton className="h-full w-px" />
         </div>
         <div className="lg:hidden my-2">
            <Skeleton className="h-px w-full" />
         </div>


        {/* Right Side: Code Display Skeleton */}
        <div className="lg:w-2/3 flex-grow overflow-hidden">
          <div className="h-full flex flex-col border rounded-lg">
             <div className="flex flex-row items-center justify-between p-4 border-b">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-8 w-8 rounded" />
             </div>
             <div className="flex-grow p-4 overflow-hidden">
               <Skeleton className="h-full w-full" />
             </div>
              <div className="p-4 border-t">
                <Skeleton className="h-4 w-48" />
              </div>
          </div>
        </div>
      </main>

       <footer className="p-2 border-t bg-card">
         <Skeleton className="h-4 w-48 mx-auto" />
      </footer>
    </div>
  );
}
