import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface LandingPageProps {
  onBuildIndex: () => void;
}

export function LandingPage({ onBuildIndex }: LandingPageProps) {
  return (
    <div className="flex flex-col h-full bg-neutral-50 justify-center items-center">
      <Card className="p-8 max-w-lg text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to TokenSmith</h1>
        <p className="text-muted-foreground mb-6">
          It looks like this is your first time here. To get started, you need to build an index of your course material.
        </p>
        <Button onClick={onBuildIndex}>Build Index</Button>
      </Card>
    </div>
  );
}
