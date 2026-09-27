param([string]$BaseUrl = 'http://localhost:8080')
$ErrorActionPreference = 'Stop'
$results = [System.Collections.Generic.List[object]]::new()
function Check($name, [scriptblock]$action) {
  try { & $action; $results.Add([pscustomobject]@{Name=$name;Status='VERIFIED'}) }
  catch { $results.Add([pscustomobject]@{Name=$name;Status='FAILED';Detail=$_.Exception.Message}) }
}
Check 'public gallery' { $g=Invoke-RestMethod "$BaseUrl/api/v1/gallery"; if($g.items.Count -lt 6){throw 'expected seeded gallery'} }
$login=$null
Check 'organizer login' { $script:login=Invoke-RestMethod -Method Post "$BaseUrl/api/v1/auth/login" -ContentType 'application/json' -Body '{"email":"organizer@trustforge.local","password":"trustforge"}'; if(!$login.accessToken){throw 'no access token'} }
$headers=@{Authorization="Bearer $($login.accessToken)"}
Check 'dashboard seed' { $d=Invoke-RestMethod "$BaseUrl/api/v1/dashboard" -Headers $headers; if($d.stats.submissions -ne 6){throw 'expected six submissions'} }
Check 'assignment metrics' { $a=Invoke-RestMethod "$BaseUrl/api/v1/assignments" -Headers $headers; if($a.metrics.coverageRate -ne 100){throw 'coverage is not complete'} }
Check 'normalization' { $n=Invoke-RestMethod "$BaseUrl/api/v1/normalization" -Headers $headers; if($n.scores.Count -ne 6){throw 'normalization did not produce six scores'} }
Check 'audit chain' { $a=Invoke-RestMethod -Method Post "$BaseUrl/api/v1/audit/verify" -Headers $headers; if(!$a.verified){throw 'audit chain failed'} }
Check 'results' { $r=Invoke-RestMethod "$BaseUrl/api/v1/results" -Headers $headers; if($r.entries.Count -ne 6){throw 'result snapshot incomplete'} }
Check 'certificate verification' { $c=Invoke-RestMethod "$BaseUrl/api/v1/certificates/verify?id=TF-2026-001"; if(!$c.verified){throw 'seed certificate invalid'} }
$judge=$null
Check 'judge login' { $script:judge=Invoke-RestMethod -Method Post "$BaseUrl/api/v1/auth/login" -ContentType 'application/json' -Body '{"email":"judge1@trustforge.local","password":"trustforge"}' }
$judgeHeaders=@{Authorization="Bearer $($judge.accessToken)"}
Check 'role isolation' { try { Invoke-RestMethod "$BaseUrl/api/v1/assignments" -Headers $judgeHeaders; throw 'judge was allowed organizer endpoint' } catch { if($_.Exception.Response.StatusCode.value__ -ne 403){throw} } }
$results | Format-Table -AutoSize
if($results.Status -contains 'FAILED'){ exit 1 }
