import { CoreLoopPrototype } from "./prototype";

type PrototypePageProps = {
  searchParams: Promise<{ variant?: string }>;
};

export default async function CoreLoopPrototypePage({
  searchParams,
}: PrototypePageProps) {
  const { variant } = await searchParams;

  return <CoreLoopPrototype initialVariant={variant} />;
}
