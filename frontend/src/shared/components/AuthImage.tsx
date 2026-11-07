import React from 'react';
import { useAuthFileUrl } from '../api/useAuthFileUrl';
import './AuthImage.css';

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string;
  fallback?: React.ReactNode;
  /** Show the whole photo (no cropping) over a blurred copy of itself; fits any aspect ratio. */
  framed?: boolean;
};

/** `<img>` that can show private API files; renders `fallback` while loading or if the file is unavailable. */
export const AuthImage: React.FC<Props> = ({ src, fallback = null, alt = '', framed = false, className, ...rest }) => {
  const url = useAuthFileUrl(src);
  if (!url) return <>{fallback}</>;
  if (!framed) return <img src={url} alt={alt} className={className} {...rest} />;
  return (
    <span className={`auth-image-frame${className ? ` ${className}` : ''}`}>
      <img src={url} alt="" aria-hidden="true" className="auth-image-frame__backdrop" />
      <img src={url} alt={alt} className="auth-image-frame__photo" loading="lazy" {...rest} />
    </span>
  );
};
