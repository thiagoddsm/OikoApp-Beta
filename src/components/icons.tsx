import type { SVGProps } from "react";

export function Logo(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img 
      src="https://firebasestorage.googleapis.com/v0/b/studio-1424813022-71754.firebasestorage.app/o/pwa%2Flogo_1772385880160.png?alt=media&token=9f992f3e-70cd-4a19-a67f-77d16369e81a" 
      alt="OikoApp Logo" 
      {...props} 
    />
  );
}
