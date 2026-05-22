import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관',
  description: 'Kormmunity 한인 커뮤니티 이용약관',
};

export default function TermsPage() {
  return (
    <section className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold">이용약관</h1>
        <p className="mt-1 text-sm text-[#888]">시행일: 2026년 5월 22일</p>
      </div>

      <article className="space-y-6 text-sm leading-relaxed text-[#333]">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제1조 (목적)</h2>
          <p>
            이 약관은 Kormmunity(이하 "서비스")가 제공하는 한인 커뮤니티 플랫폼을 이용하는 데 필요한 권리, 의무, 책임 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제2조 (정의)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>"서비스"</strong>란 Kormmunity가 운영하는 한인 커뮤니티 웹 플랫폼을 말합니다.</li>
            <li><strong>"회원"</strong>이란 이 약관에 동의하고 카카오 계정으로 로그인하여 서비스를 이용하는 자를 말합니다.</li>
            <li><strong>"콘텐츠"</strong>란 회원이 서비스에 게시한 글, 댓글, 이미지 등 일체의 정보를 말합니다.</li>
            <li><strong>"운영자"</strong>란 서비스를 운영·관리하는 운영진(모더레이터, 코디네이터, 관리자 등)을 말합니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제3조 (약관의 효력 및 변경)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>이 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</li>
            <li>서비스는 필요에 따라 약관을 변경할 수 있으며, 변경 사항은 서비스 내 공지를 통해 안내합니다.</li>
            <li>변경된 약관에 동의하지 않는 경우, 회원은 서비스 이용을 중단하고 탈퇴를 요청할 수 있습니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제4조 (회원 가입 및 로그인)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>서비스는 카카오 계정 기반 OAuth 로그인만을 지원합니다.</li>
            <li>카카오 계정으로 처음 로그인하는 경우 자동으로 회원으로 가입됩니다.</li>
            <li>로그인 또는 가입 시 이 약관과 개인정보처리방침 및 운영정책에 동의한 것으로 간주됩니다.</li>
            <li>회원은 본인 계정을 타인에게 양도하거나 공유할 수 없습니다.</li>
            <li>운영 목적으로 생성된 계정(운영자 계정)은 일반 로그인이 불가합니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제5조 (서비스의 제공)</h2>
          <p>서비스는 다음 기능을 제공합니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>게시글 작성, 수정, 삭제, 검색, 저장</li>
            <li>댓글 작성, 좋아요, 신고</li>
            <li>지역/카테고리 기반 필터링</li>
            <li>검색 알림 등록 및 카카오톡 알림 수신</li>
            <li>오픈채팅 링크를 통한 작성자 연락</li>
            <li>광고 게시물 표시</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제6조 (회원의 의무)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>회원은 허위 정보를 게시하거나 타인을 사칭해서는 안 됩니다.</li>
            <li>불법 거래, 사기, 음란물, 개인정보 침해, 혐오 표현, 반복 도배 등의 행위를 금지합니다.</li>
            <li>타인의 저작권, 초상권 등 지식재산권을 침해하는 콘텐츠를 게시할 수 없습니다.</li>
            <li>광고성 목적의 무단 게시물 또는 스팸성 콘텐츠를 게시하는 행위를 금지합니다.</li>
            <li>서비스의 정상적인 운영을 방해하는 행위를 금지합니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제7조 (콘텐츠 책임)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>회원이 게시한 콘텐츠의 법적 책임은 해당 회원에게 있습니다.</li>
            <li>서비스는 회원이 게시한 콘텐츠에 대해 사전 검열의 의무를 지지 않습니다.</li>
            <li>서비스는 운영정책에 따라 문제가 있는 콘텐츠를 보류, 삭제, 제한할 수 있습니다.</li>
            <li>게시글에 포함된 이미지는 Cloudinary 등 외부 이미지 저장 서비스를 통해 관리됩니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제8조 (연락 기능 유의사항)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>서비스는 게시글 작성자의 카카오 오픈채팅 링크를 통해 연락하는 기능을 제공합니다.</li>
            <li>연락 링크는 회원이 직접 프로필에 등록한 정보이며, 서비스가 별도로 1:1 메시지를 전송하지 않습니다.</li>
            <li>오픈채팅 링크를 통한 거래나 연락 과정에서 발생하는 분쟁은 당사자 간의 책임입니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제9조 (서비스의 변경 및 중단)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>서비스는 운영상 필요에 따라 사전 공지 후 서비스를 변경하거나 중단할 수 있습니다.</li>
            <li>불가피한 경우 사전 공지 없이 서비스가 변경되거나 중단될 수 있습니다.</li>
            <li>서비스 중단으로 인한 손실에 대해 서비스는 책임을 지지 않습니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제10조 (회원 탈퇴 및 이용 제한)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>회원은 운영자에게 탈퇴를 요청할 수 있으며, 탈퇴 시 개인정보처리방침에 따라 데이터가 처리됩니다.</li>
            <li>약관을 위반한 회원은 경고, 이용 제한, 계정 정지, 계정 삭제 등의 조치를 받을 수 있습니다.</li>
            <li>상세한 운영 기준은 운영정책을 따릅니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제11조 (면책 사항)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>서비스는 회원 간 거래 또는 연락 과정에서 발생하는 분쟁에 개입하지 않으며, 이로 인한 손해에 대해 책임을 지지 않습니다.</li>
            <li>서비스는 천재지변, 시스템 장애 등 불가항력적인 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제12조 (문의)</h2>
          <p>
            서비스 이용과 관련한 문의는 아래 이메일로 연락해 주세요.
          </p>
          <p className="font-medium">
            <a href="mailto:hello.kormmunity@gmail.com" className="text-[#555] underline">
              hello.kormmunity@gmail.com
            </a>
          </p>
        </section>
      </article>
    </section>
  );
}
