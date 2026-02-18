import Image from "next/image";

export default function Page() {
  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[#ececec] text-[#2f2f2f]">
      <div className="absolute inset-x-0 top-[42%] flex -translate-y-1/2 justify-center px-4 text-center">
        <div>
          <h1 className="font-sans text-[clamp(2rem,5vw,3.6rem)] leading-none tracking-[0.08em]">
            OOPS!!
          </h1>
          <p className="mt-3 font-sans text-[clamp(0.9rem,1.6vw,1.3rem)] tracking-[0.14em]">
            STILL UNDER CONSTRUCTION
          </p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-center">
        <Image
          src="/rick_dancing.gif"
          alt="Rick dancing"
          width={200}
          height={200}
          priority
          unoptimized
          className="h-auto w-[140px]"
        />
      </div>
    </main>
  );
}
