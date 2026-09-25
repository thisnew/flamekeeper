import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminRole, isOfficerOrAboveRole } from "@/lib/roles";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import RealmsClient from "@/components/admin/RealmsClient";

export const metadata: Metadata = { title: "公会数据更新 - 管理后台" };

export default async function AdminRealmsPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id || !isOfficerOrAboveRole(user.role)) redirect("/auth/login");

  return (
    <div className="page-enter max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> 返回后台
      </Link>

      <h1 className="font-display text-2xl font-bold text-wow-gold text-glow mb-2">
        公会数据更新
      </h1>
      <p className="text-sm text-text-muted mb-8">
        这里维护**外部公会数据**的本地副本。存本地是为了不让页面依赖外部接口的可用性 ——
        外部服务抽风时，站内功能照常工作，只是数据不再新鲜。
      </p>

      <section>
        <h2 className="font-display text-lg font-bold text-wow-gold mb-1">
          国服服务器字典
        </h2>
        <p className="text-xs text-text-muted mb-4">
          提供「中文服务器名 ↔ 短写英文名」的对应关系。WTF 导入的角色目录是中文
          （如「燃烧之刃」），而 Raider.IO 等外部接口需要英文 slug
          （如 <code className="text-wow-gold">burning-blade</code>），
          本字典就是两者之间的桥。其它功能通过 <code>lib/realms.ts</code> 查表。
        </p>
        <RealmsClient canEdit={isAdminRole(user.role)} />
      </section>
    </div>
  );
}
