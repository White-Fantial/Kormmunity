import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: 'Kormmunity 한인 커뮤니티 개인정보처리방침',
};

export default function PrivacyPage() {
  return (
    <section className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold">개인정보처리방침</h1>
        <p className="mt-1 text-sm text-[#888]">시행일: 2026년 5월 22일</p>
      </div>

      <article className="space-y-6 text-sm leading-relaxed text-[#333]">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제1조 (개인정보의 처리 목적)</h2>
          <p>Kormmunity(이하 "서비스")는 다음의 목적을 위해 개인정보를 처리합니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>회원 식별 및 로그인 서비스 제공</li>
            <li>게시글, 댓글, 저장, 좋아요 등 커뮤니티 기능 제공</li>
            <li>검색 알림 및 댓글 알림 카카오톡 메시지 발송</li>
            <li>부적절한 콘텐츠 신고 처리 및 운영·모더레이션</li>
            <li>이용 제한, 정지 등 운영 정책 집행</li>
            <li>광고 캠페인 타겟팅 및 노출 측정</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제2조 (수집하는 개인정보 항목)</h2>
          <p>서비스는 카카오 OAuth 로그인을 통해 다음 정보를 수집합니다.</p>
          <div className="space-y-3">
            <div>
              <p className="font-medium text-[#1a1a1a]">카카오 계정 연동 정보</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>카카오 고유 사용자 ID</li>
                <li>닉네임(displayName)</li>
                <li>프로필 이미지 URL</li>
                <li>카카오 액세스 토큰 및 리프레시 토큰(카카오 알림 메시지 발송 목적)</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-[#1a1a1a]">회원이 직접 등록하는 정보</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>카카오 오픈채팅 링크(작성자 연락용, 선택)</li>
                <li>거주 국가 및 도시</li>
                <li>한 줄 소개(선택)</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-[#1a1a1a]">서비스 이용 과정에서 자동 생성되는 정보</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>세션 토큰 및 만료 시각</li>
                <li>게시글, 댓글, 좋아요, 저장 기록</li>
                <li>검색 알림 키워드</li>
                <li>신고 기록 및 운영 조치 이력</li>
                <li>카카오 알림 메시지 발송 내역</li>
                <li>게시글 조회 수(fingerprint 기반 중복 방지 포함)</li>
                <li>커뮤니티 점수(neighbourWarmth) 및 변동 이력</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제3조 (개인정보의 보유 및 이용 기간)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>회원 정보는 회원이 탈퇴를 요청하거나 계정이 삭제될 때까지 보유합니다.</li>
            <li>탈퇴 처리 후 법령에서 정한 보존 기간이 있는 경우를 제외하고 지체 없이 삭제합니다.</li>
            <li>운영 조치 이력(신고 기록, 제재 이력)은 분쟁 해결 및 반복 위반 방지를 위해 계정 삭제 후에도 일정 기간 보관될 수 있습니다.</li>
            <li>만료된 세션 토큰은 주기적으로 자동 삭제됩니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제4조 (개인정보의 제3자 제공)</h2>
          <p>서비스는 원칙적으로 회원의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외입니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>회원의 동의가 있는 경우</li>
            <li>법령의 규정에 따르거나 수사기관의 요청이 있는 경우</li>
            <li>카카오 OAuth 인증 과정에서 카카오 플랫폼을 통해 처리되는 정보(카카오 개인정보처리방침 적용)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제5조 (개인정보 처리 위탁)</h2>
          <p>서비스는 서비스 운영을 위해 다음 외부 서비스를 이용합니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>카카오</strong>: OAuth 로그인, 카카오톡 알림 메시지 발송</li>
            <li><strong>Cloudinary 또는 유사 이미지 저장 서비스</strong>: 게시글 이미지 업로드 및 저장</li>
            <li><strong>AWS Amplify + Amazon RDS (PostgreSQL)</strong>: 웹 애플리케이션 및 데이터베이스 운영</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제6조 (회원의 권리와 행사 방법)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>회원은 언제든지 자신의 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.</li>
            <li>프로필 정보(닉네임, 오픈채팅 링크, 지역, 알림 설정)는 내 프로필 페이지에서 직접 수정할 수 있습니다.</li>
            <li>계정 탈퇴 및 데이터 삭제 요청은 운영자 이메일로 연락해 주세요.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제7조 (개인정보 보호를 위한 조치)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>세션 토큰은 HttpOnly 쿠키로 관리하며 외부에서 접근이 불가합니다.</li>
            <li>카카오 액세스 토큰은 암호화 없이 데이터베이스에 저장되므로 데이터베이스 접근 통제에 주의를 기울입니다.</li>
            <li>운영자는 개인정보에 대한 접근 권한을 최소화하여 관리합니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">제8조 (개인정보 보호책임자 및 문의)</h2>
          <p>개인정보 처리와 관련한 문의나 불만, 피해 구제는 아래로 연락해 주세요.</p>
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
