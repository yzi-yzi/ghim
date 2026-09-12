export interface SafeEvent {
  name: string;
  properties?: Readonly<Record<string, boolean | number | string>>;
}
