import { revalidatePath } from "next/cache";

export function revalidateInventoryViews() {
  revalidatePath("/", "layout");
}
