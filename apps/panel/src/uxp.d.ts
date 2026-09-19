declare function require(moduleName: string): any;

declare namespace JSX {
  interface IntrinsicElements {
    "sp-button": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      variant?: string;
      disabled?: boolean;
      quiet?: boolean;
    };
  }
}
