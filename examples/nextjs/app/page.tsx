import { demoBundle } from "@local/ocr-workbench/demo";
import { validateBundle } from "@local/ocr-workbench/review";
import ReviewWorkspace from "./review-workspace";

// Server Component: replace this public fixture with an authorized bundle loaded
// from the host application's document repository. Keep the value serializable.
export default function Page() {
  return <ReviewWorkspace initialBundle={validateBundle(demoBundle)} />;
}
