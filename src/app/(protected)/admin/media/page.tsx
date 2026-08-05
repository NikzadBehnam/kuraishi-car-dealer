import { adminMediaAssets, adminUsers, adminVehicles } from "@/data/admin";
import { MediaLibrary } from "./_components/media-library";

export default function AdminMediaPage() {
  return (
    <MediaLibrary
      assets={adminMediaAssets}
      users={adminUsers}
      vehicles={adminVehicles}
    />
  );
}
