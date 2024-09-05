import React from 'react';
import { generateRowData, TableRow} from '../../helpers/LoanSummaryPage.Helpers';
import { isActive } from '../../utils/General';
import PageLayout from '../PageLayout';
import Table from '../Table';

const PersonalLoanSummary = ({data, accounts}) => {

    const getEntriesPerPage = (pageIndex) => {
        return pageIndex === 0 ? 15 : 16; //pdf
        // return pageIndex === 0 ? 12 : 13;
    };

    const personalLoanAccounts = accounts.sort((a, b) => isActive(b) - isActive(a));

    const renderPages = () => {
        let currentIndex = 0;
        const pages = [];

        while (currentIndex < personalLoanAccounts.length) {
            const pageIndex = pages.length;
            const entriesPerPage = getEntriesPerPage(pageIndex);
            const pageData = personalLoanAccounts.slice(currentIndex, currentIndex + entriesPerPage);
            currentIndex += entriesPerPage;

            pages.push(
                <PageLayout
                    key={pageIndex}
                    pageIndex={pageIndex}
                    title="Summary:"
                    subtitle="Loans"
                    para="This section displays summary of all your reported loan accounts found in the Credit Bureau database."
                    id="summary-personal-loans"
                    data={data}
                >
                    <div className="mt-8">
                        <Table
                            headers={[
                                { name: 'Account Type', width: 'w-auto' },
                                { name: 'Account No', width: 'w-auto' },
                                { name: 'Ownership', width: 'w-auto' },
                                { name: 'Opened Date', width: 'w-auto' },
                                { name: 'Account Status', width: 'w-auto' },
                                { name: 'Last Bank Update', width: 'w-auto' },
                                { name: 'Loan Amount', width: 'w-auto' },
                                { name: 'Outstanding Balance', width: 'w-auto' }
                                ]}
                                rows={generateRowData(pageData)}
                                rowRenderer={(data, index) => {
                                const bgColorClass = index % 2 === 0 ? 'bg-white' : 'bg-fb-subtle';
                                const textColorClass = bgColorClass === 'bg-white' ? 'text-black' : 'text-fb-primary';
                                return(
                                    <TableRow
                                        key={index}
                                        data={data}
                                        bgColorClass={bgColorClass}
                                        textColorClass={textColorClass}
                                    />
                                )                                  
                                }}
                            headerTextSize="text-[13px]"  // text size for header
                            bodyTextSize="text-[12px]"
                        />
                    </div>
                </PageLayout>
            );
        }
        return pages;
    };

    return (
        <div> {renderPages()} </div>
    );
};

export default PersonalLoanSummary;
