'use client';

import { useState } from 'react';

import {
  extractKakaoOpenLink,
  isValidKakaoOpenLink,
  KAKAO_OPEN_LINK_PATTERN_STRING,
} from '@/lib/kakao-open-link';

type KakaoOpenLinkInputProps = {
  id: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  className?: string;
  invalidMessage: string;
};

export function KakaoOpenLinkInput({
  id,
  name,
  defaultValue,
  placeholder,
  className,
  invalidMessage,
}: KakaoOpenLinkInputProps) {
  const [value, setValue] = useState(extractKakaoOpenLink(defaultValue ?? ''));

  return (
    <input
      id={id}
      name={name}
      type="url"
      value={value}
      placeholder={placeholder}
      pattern={KAKAO_OPEN_LINK_PATTERN_STRING}
      onChange={(event) => {
        setValue(event.target.value);
      }}
      onPaste={(event) => {
        const text = event.clipboardData.getData('text');
        const cleaned = extractKakaoOpenLink(text);

        event.preventDefault();
        setValue(cleaned);
      }}
      onBlur={(event) => {
        setValue(extractKakaoOpenLink(event.target.value));
      }}
      onInput={(event) => {
        event.currentTarget.setCustomValidity('');
      }}
      onInvalid={(event) => {
        const currentValue = event.currentTarget.value.trim();
        if (currentValue && !isValidKakaoOpenLink(currentValue)) {
          event.currentTarget.setCustomValidity(invalidMessage);
        } else {
          event.currentTarget.setCustomValidity('');
        }
      }}
      className={className}
    />
  );
}
