import { OasisEditor2App, type OasisEditor2AppProps } from "./OasisEditor2App.js";

export interface OasisEditor2ContainerProps extends Omit<OasisEditor2AppProps, "showChrome"> {}

export function OasisEditor2Container(props: OasisEditor2ContainerProps) {
  return <OasisEditor2App {...props} showChrome={false} />;
}
