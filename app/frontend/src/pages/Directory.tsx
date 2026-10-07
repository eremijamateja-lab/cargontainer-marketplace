import { useState, useEffect } from 'react';
import { t, formatCompanyRoleLabel } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyDirectory } from '@/hooks/useAppQueries';
import { COMPANY_TYPES, COMPANY_TYPE_MAP, COMPANY_ROLE_MAP, COUNTRIES, COUNTRY_MAP, countryFlag } from '@/lib/constants';
import { parseCompanyRoles } from '@/lib/formatCompanyRoles';
import Layout from '@/components/Layout';
import Flag from '@/components/Flag';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Building2, MapPin, Phone, Mail, Globe, Users, ChevronRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function Directory() {
  useLanguage(); // Subscribe to language changes for re-render
  const { user, profile, isAdmin, loading, handleLogout } = useAuth();

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Detail dialog
  const [selectedCompany, setSelectedCompany] = useState<any>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Directory is a public endpoint — enable query as soon as auth loading is done
  // Do NOT require profile to exist (the backend endpoint has no auth requirement)
  const { data: directoryData, isLoading: directoryLoading, error: directoryError } = useCompanyDirectory(
    { search: debouncedSearch || undefined, company_type: filterType || undefined, country: filterCountry || undefined, limit: 50 },
    !loading
  );

  const companies = directoryData?.items || [];
  const total = directoryData?.total || 0;
  const hasFilters = !!debouncedSearch || !!filterType || !!filterCountry;

  // Debug logging for production troubleshooting
  useEffect(() => {
    if (directoryData) {
      console.log(`[Directory] API returned ${directoryData.total} companies, displaying ${companies.length}`);
    }
    if (directoryError) {
      console.error('[Directory] API error:', directoryError);
    }
  }, [directoryData, directoryError, companies.length]);

  if (loading) {
    return (
      <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('directory.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('directory.subtitle')}</p>
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('directory.search')}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Company Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
            >
              <option value="">{t('directory.allTypes')}</option>
              {COMPANY_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.emoji} {ct.label}</option>
              ))}
            </select>

            {/* Country Filter */}
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
            >
              <option value="">{t('directory.allCountries')}</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{countryFlag(c.code)} {c.name}</option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setFilterType(''); setFilterCountry(''); }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                <X className="w-3 h-3" /> {t('filter.clearAll')}
              </button>
            )}

            <span className="text-xs text-gray-400 self-center ml-auto">
              {total} {total === 1 ? t('directory.companyCountSingular') : t('directory.companyCount')}
            </span>
          </div>
        </div>

        {/* Results */}
        {directoryLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">{t('directory.empty')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {companies.map((company: any) => {
              // Get all roles from both company_type and company_roles
              const allRoles = parseCompanyRoles(
                company.company_roles || company.company_type || ''
              );
              // Also include company_type if it's a known role and not already in allRoles
              const typeKey = company.company_type || '';
              const typeInfo = COMPANY_TYPE_MAP[typeKey] || COMPANY_ROLE_MAP[typeKey];
              if (typeInfo && !allRoles.includes(typeKey)) {
                // Check if normalized version is already present
                const normalizedTypeKey = typeKey === 'forwarder' ? 'freight_forwarder' : typeKey;
                if (!allRoles.includes(normalizedTypeKey)) {
                  allRoles.unshift(normalizedTypeKey);
                }
              }

              return (
                <Card
                  key={company.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedCompany(company)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">{company.company_name || '—'}</h3>
                          {allRoles.slice(0, 3).map((role) => {
                            const roleInfo = COMPANY_ROLE_MAP[role] || COMPANY_TYPE_MAP[role];
                            if (!roleInfo) return null;
                            return (
                              <span key={role} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${roleInfo.color}`}>
                                {roleInfo.emoji} {formatCompanyRoleLabel(role)}
                              </span>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                          {(company.country || company.city) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {company.country && <Flag code={company.country} className="w-4 h-3" />} {COUNTRY_MAP[company.country] || company.country || ''}
                              {company.city ? `, ${company.city}` : ''}
                            </span>
                          )}
                          {company.member_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {company.member_count} {t('directory.memberCount')}
                            </span>
                          )}
                        </div>
                        {company.description && (
                          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{company.description}</p>
                        )}
                        {/* Quick contact */}
                        <div className="flex items-center gap-3 mt-2">
                          {company.phone && (
                            <a href={`tel:${company.phone}`} onClick={(e) => e.stopPropagation()} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {company.phone}
                            </a>
                          )}
                          {company.email && (
                            <a href={`mailto:${company.email}`} onClick={(e) => e.stopPropagation()} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {company.email}
                            </a>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Company Detail Dialog */}
        <Dialog open={!!selectedCompany} onOpenChange={() => setSelectedCompany(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            {selectedCompany && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    {selectedCompany.company_name || '—'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  {/* Roles + Location */}
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const detailRoles = parseCompanyRoles(
                        selectedCompany.company_roles || selectedCompany.company_type || ''
                      );
                      const detailTypeKey = selectedCompany.company_type || '';
                      const detailTypeInfo = COMPANY_TYPE_MAP[detailTypeKey] || COMPANY_ROLE_MAP[detailTypeKey];
                      if (detailTypeInfo && !detailRoles.includes(detailTypeKey)) {
                        const normalizedKey = detailTypeKey === 'forwarder' ? 'freight_forwarder' : detailTypeKey;
                        if (!detailRoles.includes(normalizedKey)) {
                          detailRoles.unshift(normalizedKey);
                        }
                      }
                      return detailRoles.map((role) => {
                        const roleInfo = COMPANY_ROLE_MAP[role] || COMPANY_TYPE_MAP[role];
                        if (!roleInfo) return null;
                        return (
                          <span key={role} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${roleInfo.color}`}>
                            {roleInfo.emoji} {formatCompanyRoleLabel(role)}
                          </span>
                        );
                      });
                    })()}
                    {(selectedCompany.country || selectedCompany.city) && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                        {selectedCompany.country && <Flag code={selectedCompany.country} className="w-4 h-3" />} {COUNTRY_MAP[selectedCompany.country] || selectedCompany.country || ''}
                        {selectedCompany.city ? `, ${selectedCompany.city}` : ''}
                      </span>
                    )}
                  </div>

                  {selectedCompany.description && (
                    <p className="text-sm text-gray-600">{selectedCompany.description}</p>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</h4>
                    <div className="space-y-1.5">
                      {selectedCompany.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <a href={`mailto:${selectedCompany.email}`} className="text-blue-600 hover:underline">{selectedCompany.email}</a>
                        </div>
                      )}
                      {selectedCompany.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <a href={`tel:${selectedCompany.phone}`} className="text-blue-600 hover:underline">{selectedCompany.phone}</a>
                        </div>
                      )}
                      {selectedCompany.website && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="w-3.5 h-3.5 text-gray-400" />
                          <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedCompany.website}</a>
                        </div>
                      )}
                    </div>
                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-2">
                      {selectedCompany.phone && (
                        <>
                          <a href={`tel:${selectedCompany.phone}`} className="flex-1 text-center py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            📞 Call
                          </a>
                          <a href={`https://wa.me/${selectedCompany.phone.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700">
                            💬 WhatsApp
                          </a>
                          <a href={`viber://chat?number=${selectedCompany.phone.replace(/[^0-9+]/g, '')}`} className="flex-1 text-center py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                            📱 Viber
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Capabilities */}
                  {selectedCompany.capabilities && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('company.capabilities')}</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {selectedCompany.capabilities.vehicle_count > 0 && (
                          <div className="bg-gray-50 rounded-lg p-2.5">
                            <div className="text-[10px] text-gray-500">{t('company.vehicleCount')}</div>
                            <div className="font-semibold text-sm">{selectedCompany.capabilities.vehicle_count}</div>
                          </div>
                        )}
                        {selectedCompany.capabilities.vehicle_types && (
                          <div className="bg-gray-50 rounded-lg p-2.5">
                            <div className="text-[10px] text-gray-500">{t('company.vehicleTypes')}</div>
                            <div className="text-xs font-medium">{selectedCompany.capabilities.vehicle_types}</div>
                          </div>
                        )}
                        {selectedCompany.capabilities.main_routes && (
                          <div className="bg-gray-50 rounded-lg p-2.5">
                            <div className="text-[10px] text-gray-500">{t('company.mainRoutes')}</div>
                            <div className="text-xs font-medium">{selectedCompany.capabilities.main_routes}</div>
                          </div>
                        )}
                        {selectedCompany.capabilities.countries_covered && (
                          <div className="bg-gray-50 rounded-lg p-2.5">
                            <div className="text-[10px] text-gray-500">{t('company.countriesCovered')}</div>
                            <div className="text-xs font-medium">{selectedCompany.capabilities.countries_covered}</div>
                          </div>
                        )}
                        {selectedCompany.capabilities.service_regions && (
                          <div className="bg-gray-50 rounded-lg p-2.5">
                            <div className="text-[10px] text-gray-500">{t('company.serviceRegions')}</div>
                            <div className="text-xs font-medium">{selectedCompany.capabilities.service_regions}</div>
                          </div>
                        )}
                        {selectedCompany.capabilities.customs_services && (
                          <div className="bg-amber-50 rounded-lg p-2.5">
                            <div className="text-[10px] text-amber-600">{t('company.customsServices')}</div>
                            <div className="font-semibold text-amber-700 text-sm">✓</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}