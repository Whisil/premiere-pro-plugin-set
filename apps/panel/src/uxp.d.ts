declare function require(moduleName: string): any;

declare namespace JSX {
  interface IntrinsicElements {
    "uxp-panel": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      panelid?: string;
    };
  }
}
