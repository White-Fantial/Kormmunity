import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '운영정책',
  description: 'Kormmunity 한인 커뮤니티 운영정책',
};

export default function CommunityGuidelinesPage() {
  return (
    <section className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold">운영정책</h1>
        <p className="mt-1 text-sm text-[#888]">시행일: 2026년 5월 22일</p>
      </div>

      <article className="space-y-6 text-sm leading-relaxed text-[#333]">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">1. 목적</h2>
          <p>
            이 운영정책은 Kormmunity(이하 "서비스")의 건전한 커뮤니티 문화를 유지하고 회원 모두가 쾌적하게 이용할 수 있도록 콘텐츠 기준, 운영 절차, 제재 기준을 규정합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">2. 운영 역할</h2>
          <div className="space-y-3">
            <div className="rounded-lg border border-[#e8e8e8] p-3">
              <p className="font-medium text-[#1a1a1a]">일반 회원</p>
              <p className="mt-1 text-[#555]">게시글 작성, 댓글, 신고, 저장, 좋아요 등 기본 커뮤니티 활동 가능</p>
            </div>
            <div className="rounded-lg border border-[#e8e8e8] p-3">
              <p className="font-medium text-[#1a1a1a]">코디네이터</p>
              <p className="mt-1 text-[#555]">커뮤니티 활성화 보조, 필요 시 별도 권한 부여를 통한 운영 지원</p>
            </div>
            <div className="rounded-lg border border-[#e8e8e8] p-3">
              <p className="font-medium text-[#1a1a1a]">모더레이터</p>
              <p className="mt-1 text-[#555]">콘텐츠 보류·복구·삭제, 신고 확인·처리, 사용자 검토 요청</p>
            </div>
            <div className="rounded-lg border border-[#e8e8e8] p-3">
              <p className="font-medium text-[#1a1a1a]">관리자</p>
              <p className="mt-1 text-[#555]">모든 콘텐츠 및 회원 상태 최종 결정, 역할·권한 부여, 카테고리·지역·운영 설정 관리</p>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">3. 금지 콘텐츠</h2>
          <p>다음에 해당하는 콘텐츠는 서비스 내에서 금지됩니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>불법 거래</strong>: 법으로 금지된 물품 또는 서비스의 거래 게시글</li>
            <li><strong>사기</strong>: 허위 정보 기재, 대금 편취 목적의 게시글</li>
            <li><strong>개인정보 노출</strong>: 타인의 이름, 연락처, 주소 등 개인정보를 동의 없이 게시하는 행위</li>
            <li><strong>혐오·차별 표현</strong>: 인종, 국적, 성별, 종교, 장애 등을 이유로 한 혐오 또는 차별적 표현</li>
            <li><strong>반복 도배</strong>: 동일하거나 유사한 내용을 단기간에 반복 게시하는 행위</li>
            <li><strong>무단 광고·스팸</strong>: 운영자의 허가 없이 상업적 목적으로 게시하는 홍보 콘텐츠</li>
            <li><strong>음란물</strong>: 성적으로 노골적인 이미지, 텍스트, 링크</li>
            <li><strong>타인 사칭</strong>: 다른 회원, 운영자, 공인 등을 사칭하는 행위</li>
            <li><strong>시스템 방해</strong>: 서비스 운영을 방해하거나 보안을 침해하는 행위</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">4. 신고 및 검토 절차</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>회원은 서비스 내 신고 기능을 통해 부적절한 게시글 또는 댓글을 신고할 수 있습니다.</li>
            <li>신고된 콘텐츠는 모더레이터가 검토하며, 커뮤니티 점수 기반으로 자동 보류될 수 있습니다.</li>
            <li>모더레이터는 검토 후 콘텐츠를 <strong>게시 유지</strong>, <strong>보류(HELD)</strong>, 또는 <strong>삭제 요청</strong>으로 처리합니다.</li>
            <li>최종 삭제 및 사용자 제재 결정은 관리자가 합니다.</li>
            <li>모든 운영 조치는 로그로 기록됩니다.</li>
          </ol>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">5. 콘텐츠 상태</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>PUBLISHED (게시)</strong>: 정상 노출 상태</li>
            <li><strong>HELD (보류)</strong>: 검토가 필요한 콘텐츠. 일반 회원에게 노출되지 않으며, 모더레이터·관리자만 조회 가능</li>
            <li><strong>DELETED (삭제)</strong>: 삭제 처리된 콘텐츠. 노출되지 않으며 복구되지 않음</li>
          </ul>
          <p className="text-[#555]">보류 또는 삭제된 게시글에 설정된 상단 고정은 자동으로 해제됩니다.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">6. 사용자 제재</h2>
          <p>위반 심각도와 반복 여부에 따라 다음과 같이 조치합니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>이용 제한(LIMITED)</strong>: 새 게시글 및 댓글 작성이 제한됩니다.</li>
            <li><strong>이용 정지(SUSPENDED)</strong>: 서비스 내 모든 활동이 제한됩니다.</li>
            <li><strong>계정 삭제(DELETED)</strong>: 계정이 비활성화되며 로그인이 불가합니다.</li>
          </ul>
          <p className="text-[#555]">최종 이용 제한·정지·삭제 결정은 관리자만 할 수 있습니다. 모더레이터는 관리자 검토 요청을 할 수 있습니다.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">7. 광고 정책</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>광고 게시물은 운영자(광고 매니저)의 승인을 거쳐 게시됩니다.</li>
            <li>광고주는 광고주 멤버 계정을 통해 광고 제안 및 캠페인 진행 상태를 확인할 수 있습니다.</li>
            <li>승인되지 않은 상업성 게시물은 무단 광고로 간주되어 삭제될 수 있습니다.</li>
            <li>광고 문의는 운영자 이메일로 연락해 주세요.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#1a1a1a]">8. 이의 제기</h2>
          <p>운영 조치에 이의가 있는 경우 아래 이메일로 이의를 제기할 수 있습니다. 운영자가 검토 후 답변드립니다.</p>
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
