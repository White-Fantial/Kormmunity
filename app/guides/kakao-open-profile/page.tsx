import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: '카카오 오픈프로필 설정방법',
  description: '카카오 오픈채팅 오픈프로필 만들기와 링크 복사 방법 안내',
};

export default function KakaoOpenProfileGuidePage() {
  return (
    <section className="space-y-6 rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
      <div>
        <h1 className="text-xl font-bold">카카오 오픈프로필 설정방법</h1>
        <p className="mt-1 text-sm text-[#666]">
          게시글과 프로필에 등록할 카카오 오픈채팅 링크를 쉽고 빠르게 만드는 방법이에요.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#efefef]">
        <Image
          src="/images/guides/kakao-open-profile-setup.svg"
          alt="카카오 오픈프로필 만들기 단계 안내 이미지"
          width={1200}
          height={675}
          className="h-auto w-full"
          priority
        />
      </div>

      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[#333]">
        <li>카카오톡에서 오픈채팅 탭으로 이동한 뒤, 오픈채팅 만들기를 선택해 주세요.</li>
        <li>대화방 이름, 소개, 참여 조건을 설정하고 오픈프로필(프로필 설정)을 작성해 주세요.</li>
        <li>생성 완료 후 공유 버튼에서 링크 복사를 눌러 URL을 복사해 주세요.</li>
        <li>
          복사한 링크가 <span className="font-semibold">https://open.kakao.com/o/...</span> 형식인지
          확인한 뒤 프로필이나 글 작성 화면에 붙여 넣으면 됩니다.
        </li>
      </ol>

      <p className="rounded-lg bg-[#fff9db] px-3 py-2 text-xs text-[#6b5b00]">
        오픈채팅 링크에는 개인정보(전화번호, 이메일 등)가 포함되지 않도록 꼭 확인해 주세요.
      </p>
    </section>
  );
}
