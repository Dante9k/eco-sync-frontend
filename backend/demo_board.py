"""Fictional, read-only board fixtures; never used for table writes."""
from datetime import timedelta
from .models import iso, utc_now

NAMES = [
    ('林悦', '产品研发部'), ('陈默', '质量管理部'), ('周宁', '供应链部'),
    ('许知远', '工程技术部'), ('沈佳', '产品研发部'), ('陆川', '制造运营部'),
    ('苏晴', '质量管理部'), ('顾言', '工程技术部'), ('宋一诺', '供应链部'),
    ('江澄', '制造运营部'), ('夏禾', '产品研发部'), ('唐宁', '项目管理部'),
]
TOPICS = [
    ('优化装配流程，更新作业指导书', '工艺优化', '减少重复装配工序，统一各区域的操作规范。'),
    ('更新核心零件的检验标准', '质量改善', '补充来料检验项目，提升检测的一致性。'),
    ('替换包装材料并完成验证', '材料替换', '采用新的缓冲材料，完成运输测试后切换。'),
    ('调整产品标签与追溯规则', '设计变更', '统一标签格式，补充生产批次与追溯信息。'),
    ('修订供应商交付验收清单', '流程调整', '完善交付检查清单，明确双方验收责任。'),
    ('更新设备维护与点检流程', '工艺优化', '增加关键设备点检项，并更新维护记录模板。'),
    ('完善试产问题的闭环记录', '质量改善', '整理验证结果，补充责任人与完成时间。'),
    ('调整产品结构件尺寸公差', '设计变更', '依据验证结果修订公差，并同步相关图纸。'),
    ('升级零件替代方案', '材料替换', '完成替代零件评估，统一后续采购标准。'),
    ('统一区域出货检查要求', '流程调整', '合并检查要求，补充特殊区域的检验条款。'),
    ('更新控制模块测试规范', '质量改善', '增加环境测试条件并记录最终验收结果。'),
    ('修订生产线换型指导书', '工艺优化', '简化换型步骤，明确异常情况的处理方式。'),
    ('完善产品外观验收样本', '设计变更', '更新验收图片与判定说明，统一质量口径。'),
    ('优化备件申领与审批流程', '流程调整', '梳理申请字段，补充审批与领用记录。'),
    ('调整物料替换生效范围', '材料替换', '明确新旧物料的切换批次和适用区域。'),
    ('更新过程检验抽样方案', '质量改善', '结合验证结果调整抽样比例和检查频次。'),
    ('修订技术文件归档规范', '流程调整', '补充文件版本要求和归档校验清单。'),
    ('完成新工装验证与导入', '工艺优化', '整理试用反馈，完成导入前的最终确认。'),
]

def build_demo_board():
    now = utc_now().replace(hour=2, minute=0, second=0, microsecond=0)
    people = [{'id': f'member-{i + 1:02}', 'name': name, 'department': department}
              for i, (name, department) in enumerate(NAMES)]
    records = []
    tasks_by_record = {}
    def ref(person):
        return {'id': person['id'], 'name': person['name']}
    for i, (content, kind, reason) in enumerate(TOPICS):
        creator = people[i % 11]
        owner = people[0 if i == 0 else (i * 3 + 1) % 11]
        assistants = [people[(i + 4) % 11]]
        if i % 4 == 0:
            assistants.append(people[(i + 6) % 11])
        status = ['处理中', '待确认', '处理中', '已关闭'][i % 4]
        days = 3 + (i * 7) % 26
        start = now - timedelta(days=days)
        closed = now - timedelta(days=1) if status == '已关闭' else None
        records.append({
            'recordId': f'demo-record-{i + 1:03}', 'number': f'EXO-{now.year}-{184 - i:04}',
            'type': kind, 'reason': reason, 'content': content,
            'startedAt': iso(start), 'durationDays': days - (1 if closed else 0),
            'closedAt': iso(closed) if closed else None, 'status': status,
            'impacts': [['装配流程', '作业指导书'], ['零件检验', '供应商'], ['物料清单', '包装规范']][i % 3],
            'regions': [['华东', '华南'], ['华北'], ['华东', '西南'], ['华南']][i % 4],
            'creator': ref(creator), 'creatorDepartment': creator['department'],
            'relatedFileNumbers': [f'DOC-{now.year}-{120 + i:03}'] + ([f'SOP-{40 + i:03}'] if i % 3 == 0 else []),
            'relatedFileStartedAt': iso(start), 'relatedFileClosedAt': iso(closed) if closed else None,
        })
        tasks = []
        task_count = [3, 7, 2, 4, 1, 6, 0][i % 7]
        for j in range(task_count):
            primary = owner if j == 0 else people[(i + j) % 11]
            secondary = assistants if j == 0 else [people[(i + j + 5) % 11]]
            task_status = '已完成' if closed or j % 3 == 2 else ('进行中' if j % 3 == 0 else '待确认')
            if i == 0:
                primary = people[j]
                secondary = [[people[4]], [people[6]], [people[1]]][j]
            tasks.append({
                'taskId': f'demo-task-{i + 1:03}-{j + 1:02}',
                'taskNumber': f'TASK-{now.year}-{320 + i:04}-{j + 1:02}',
                'taskPrimaryOwner': ref(primary), 'taskSecondaryOwners': [ref(p) for p in secondary],
                'taskStatus': task_status, 'taskStartedAt': iso(start + timedelta(hours=j + 2)),
                'taskUpdatedAt': iso(now - timedelta(hours=i + j)),
            })
        tasks_by_record[records[-1]['recordId']] = tasks
    return people, records, tasks_by_record, iso(now)
