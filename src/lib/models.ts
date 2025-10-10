export interface StyleModel {
  id: string;
  name: string;
  imageSrc: string;
  prompt: string;
  loraUrl?: string;
  overlay?: boolean;
}

export const styleModels: StyleModel[] = [];
