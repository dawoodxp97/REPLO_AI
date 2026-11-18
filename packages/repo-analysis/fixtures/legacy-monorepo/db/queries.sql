select r.id, r.title, count(e.id) as rows
from reports r
left join report_events e on e.report_id = r.id
where r.owner_id = $1
group by r.id, r.title;
