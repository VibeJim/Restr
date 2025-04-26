import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200 mt-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-base font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/support?tab=help-center"
                  className="text-sm text-neutral-600 hover:underline"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/support?tab=safety"
                  className="text-sm text-neutral-600 hover:underline"
                >
                  Safety information
                </Link>
              </li>
              <li>
                <Link
                  href="/support?tab=cancellation"
                  className="text-sm text-neutral-600 hover:underline"
                >
                  Cancellation options
                </Link>
              </li>
              {/* <li><Link href="/report" className="text-sm text-neutral-600 hover:underline">Report a concern</Link></li>*/}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold mb-4">Community</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/community"
                  className="text-sm text-neutral-600 hover:underline"
                >
                  restr community
                </Link>
              </li>
              <li>
                <Link
                  href="/community?tab=guide"
                  className="text-sm text-neutral-600 hover:underline"
                >
                  How to host responsibly
                </Link>
              </li>
              <li>
                <Link
                  href="/community?tab=posts"
                  className="text-sm text-neutral-600 hover:underline"
                >
                  Community notes
                </Link>
              </li>
              <li>
                <a
                  href="https://nostr.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-600 hover:underline"
                >
                  NOSTR protocol
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold mb-4">About</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-neutral-600 hover:underline"
                >
                  How restr works
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/nostr-protocol/nostr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-600 hover:underline"
                >
                  NOSTR protocol
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/nostrbnb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-600 hover:underline"
                >
                  Open source
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-neutral-200 pt-6 mt-6 flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-neutral-600 mb-4 md:mb-0">
            © 2025 restr, Inc. ·{" "}
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>{" "}
            ·{" "}
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>{" "}
            ·{" "}
            <Link href="/sitemap" className="hover:underline">
              Sitemap
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <i className="ri-global-line mr-2"></i>
              <a href="#" className="text-sm font-medium hover:underline">
                English (US)
              </a>
            </div>
            <div className="flex items-center">
              <i className="ri-bitcoin-fill mr-2"></i>
              <a href="#" className="text-sm font-medium hover:underline">
                SATS
              </a>
            </div>
            <div className="flex space-x-4">
              <a
                href="https://github.com/nostrbnb"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 hover:text-primary"
              >
                <i className="ri-github-fill text-lg"></i>
              </a>
              <a
                href="https://twitter.com/nostr_protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 hover:text-primary"
              >
                <i className="ri-twitter-x-fill text-lg"></i>
              </a>
              <a
                href="https://discord.com/invite/nostr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 hover:text-primary"
              >
                <i className="ri-discord-fill text-lg"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
