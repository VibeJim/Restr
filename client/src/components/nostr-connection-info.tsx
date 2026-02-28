import { useNostr } from '@/context/nostr-provider';
import { Button } from '@/components/ui/button';

interface NostrConnectionInfoProps {
  onConnectClick: () => void;
}

export default function NostrConnectionInfo({ onConnectClick }: NostrConnectionInfoProps) {
  const { isConnected, isLoading } = useNostr();

  if (isLoading || isConnected) {
    return null;
  }

  return (
    <div className="bg-[#E6FAF8] border-b border-[#CCF5F1] rounded-xl mt-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <i className="ri-information-line text-[#00A699] mr-2"></i>
            <p className="text-sm text-[#005953]">
              Connect with NOSTR to contact hosts, leave reviews, list your property and even get paid.
            </p>
          </div>
          <Button 
            variant="ghost"
            className="text-sm font-medium text-[#00A699] hover:text-[#007F76] underline"
            onClick={onConnectClick}
          >
            Connect
          </Button>
        </div>
      </div>
    </div>
  );
}
